'use client';

import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import Image from 'next/image';

import AdminLayout from '@/app/components/AdminLayout';
import SeasonSelector from '@/app/components/SeasonSelector';
import { generateTeamCredentialPdf } from '@/lib/credential-pdf';
import { renderCredentialImage } from '@/lib/credential-render';
import { optimizePlayerPhoto } from '@/lib/image-client';
import {
  getCredentialStatusLabel,
  type PlayerCredentialStatus,
} from '@/lib/player-credentials';
import { supabase } from '@/lib/supabase';
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  UploadOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Collapse,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';

const { Title, Text } = Typography;
const CATEGORIES = ['Libre', 'Veteranos', 'Femenil', '3ra'];

interface Team {
  id: number;
  name: string;
  category: string;
  status: string;
  permissions_used: number;
  defaults_count: number;
  season_id: number;
}

interface Player {
  id: number;
  team_id: number;
  name: string;
  number: number | null;
  category?: string | null;
  is_active: boolean;
  photo_url?: string | null;
  photo_thumb_url?: string | null;
  photo_public_id?: string | null;
  photo_provider?: string | null;
  registered_at?: string | null;
}

interface PlayerCredential {
  id: string;
  player_id: number;
  season_id: number;
  version: number;
  credential_code: string;
  verify_token: string;
  status: PlayerCredentialStatus;
  issued_at: string;
}

interface PlayerFormValues {
  name: string;
  number?: number | null;
}

interface PhotoDraft {
  photoUrl: string;
  thumbUrl: string;
  publicId: string | null;
  provider: string | null;
  previewUrl: string;
  previewKind: 'remote' | 'object';
}

interface CloudinarySignaturePayload {
  apiKey: string;
  cloudName: string;
  folder: string;
  publicId: string;
  signature: string;
  timestamp: number;
}

interface CredentialPreviewState {
  imageUrl: string | null;
  loading: boolean;
  open: boolean;
}

interface BulkCredentialIssueResult {
  eligibleCount: number;
  issuedCount: number;
  scopeLabel: string;
  skippedCount: number;
}

interface PlayerCredentialMutationResult {
  credential: PlayerCredential;
}

type CredentialMap = Map<number, PlayerCredential>;

function buildCloudinaryThumbUrl(url: string) {
  return url.replace(
    '/upload/',
    '/upload/f_auto,q_auto,w_240,h_240,c_fill,g_face/'
  );
}

function getPlayerPhotoDraft(player: Player | null): PhotoDraft | null {
  if (!player?.photo_url) {
    return null;
  }

  return {
    photoUrl: player.photo_url,
    thumbUrl: player.photo_thumb_url ?? player.photo_url,
    publicId: player.photo_public_id ?? null,
    provider: player.photo_provider ?? null,
    previewUrl: player.photo_thumb_url ?? player.photo_url,
    previewKind: 'remote',
  };
}

export default function TeamsPage() {
  const { message, modal } = App.useApp();
  const qc = useQueryClient();
  const [teamForm] = Form.useForm();
  const [playerForm] = Form.useForm<PlayerFormValues>();
  const [teamModal, setTeamModal] = useState(false);
  const [playerModal, setPlayerModal] = useState<number | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [photoDraft, setPhotoDraft] = useState<PhotoDraft | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [credentialPreview, setCredentialPreview] = useState<CredentialPreviewState>({
    imageUrl: null,
    loading: false,
    open: false,
  });
  const [credentialOverrides, setCredentialOverrides] = useState<CredentialMap>(new Map());
  const [viewportWidth, setViewportWidth] = useState(1280);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function replacePhotoDraft(next: PhotoDraft | null) {
    setPhotoDraft((current) => {
      if (current?.previewKind === 'object') {
        URL.revokeObjectURL(current.previewUrl);
      }

      return next;
    });
  }

  function replaceCredentialPreview(next: CredentialPreviewState) {
    setCredentialPreview((current) => {
      if (current.imageUrl?.startsWith('blob:') && current.imageUrl !== next.imageUrl) {
        URL.revokeObjectURL(current.imageUrl);
      }

      return next;
    });
  }

  function getPlayerCredential(playerId: number) {
    return credentialOverrides.get(playerId) ?? credentialByPlayer.get(playerId);
  }

  function resetPlayerEditorState() {
    setEditingPlayer(null);
    playerForm.resetFields();
    replacePhotoDraft(null);
    setIsUploadingPhoto(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function openNewPlayerModal(teamId: number) {
    setPlayerModal(teamId);
    resetPlayerEditorState();
  }

  function openPlayerForEdit(player: Player) {
    setEditingPlayer(player);
    playerForm.setFieldsValue({
      name: player.name,
      number: player.number,
    });
    replacePhotoDraft(getPlayerPhotoDraft(player));
    hydratePlayerCredential(player.id).catch((error) => {
      message.warning(
        error instanceof Error
          ? error.message
          : 'No se pudo cargar la credencial del jugador.'
      );
    });
  }

  async function hydratePlayerCredential(playerId: number) {
    if (!seasonId) {
      return;
    }

    const response = await fetch(
      `/api/admin/player-credential?playerId=${playerId}&seasonId=${seasonId}`,
      {
        method: 'GET',
      }
    );

    const payload = (await parseJsonResponse(response)) as {
      error?: string;
      credential?: PlayerCredential | null;
    };

    if (!response.ok) {
      throw new Error(payload.error ?? 'No se pudo consultar la credencial del jugador.');
    }

    if (payload.credential) {
      setCredentialOverrides((current) => {
        const next = new Map(current);
        next.set(playerId, payload.credential as PlayerCredential);
        return next;
      });
    }
  }

  async function requestCloudinarySignature(playerName: string, teamId: number, activeSeasonId: number) {
    const response = await fetch('/api/admin/cloudinary/sign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerName,
        seasonId: activeSeasonId,
        teamId,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error ?? 'No se pudo preparar la subida a Cloudinary.');
    }

    return payload as CloudinarySignaturePayload;
  }

  async function deleteCloudinaryAsset(publicId: string) {
    const response = await fetch('/api/admin/cloudinary-remove', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publicId }),
    });
    const payload = await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(payload.error ?? 'No se pudo eliminar la foto anterior en Cloudinary.');
    }
  }

  async function parseJsonResponse(response: Response) {
    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      return response.json() as Promise<{ error?: string }>;
    }

    const text = await response.text();
    throw new Error(
      `La ruta respondio ${response.status} ${response.statusText}. Respuesta no JSON: ${text.slice(0, 140)}`
    );
  }

  async function handlePhotoSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const playerName = playerForm.getFieldValue('name')?.trim();

      if (!playerName) {
        throw new Error('Captura primero el nombre del jugador antes de subir la foto.');
      }

      if (!playerModal || !seasonId) {
        throw new Error('No hay equipo o temporada seleccionada para esta foto.');
      }

      if (!file.type.startsWith('image/')) {
        throw new Error('Selecciona un archivo de imagen valido.');
      }

      if (file.size > 8 * 1024 * 1024) {
        throw new Error('La foto original supera el limite de 8 MB.');
      }

      setIsUploadingPhoto(true);

      const optimized = await optimizePlayerPhoto(file);
      const signature = await requestCloudinarySignature(playerName, playerModal, seasonId);
      const uploadData = new FormData();

      uploadData.append('file', optimized.blob, 'jugador.jpg');
      uploadData.append('api_key', signature.apiKey);
      uploadData.append('timestamp', String(signature.timestamp));
      uploadData.append('signature', signature.signature);
      uploadData.append('folder', signature.folder);
      uploadData.append('public_id', signature.publicId);

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
        {
          method: 'POST',
          body: uploadData,
        }
      );

      const uploadPayload = await uploadResponse.json();

      if (!uploadResponse.ok || !uploadPayload.secure_url) {
        throw new Error(uploadPayload.error?.message ?? 'Cloudinary no acepto la foto.');
      }

      const nextDraft: PhotoDraft = {
        photoUrl: uploadPayload.secure_url,
        thumbUrl: buildCloudinaryThumbUrl(uploadPayload.secure_url),
        publicId: uploadPayload.public_id ?? signature.publicId,
        provider: 'cloudinary',
        previewUrl: optimized.previewUrl,
        previewKind: 'object',
      };

      const existingDraft = photoDraft;

      replacePhotoDraft(nextDraft);

      if (
        existingDraft?.provider === 'cloudinary' &&
        existingDraft.publicId &&
        existingDraft.publicId !== editingPlayer?.photo_public_id
      ) {
        deleteCloudinaryAsset(existingDraft.publicId).catch(() => {
          message.warning('La foto temporal anterior no se pudo limpiar en Cloudinary.');
        });
      }

      message.success('Foto subida y optimizada correctamente.');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'No se pudo subir la foto.');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function removeCurrentPhoto() {
    const currentPublicId = photoDraft?.publicId;
    const shouldDeleteRemote =
      photoDraft?.provider === 'cloudinary' &&
      !!currentPublicId &&
      currentPublicId !== editingPlayer?.photo_public_id;

    replacePhotoDraft(null);

    if (shouldDeleteRemote && currentPublicId) {
      try {
        await deleteCloudinaryAsset(currentPublicId);
      } catch {
        message.warning('La foto temporal no se pudo eliminar en Cloudinary.');
      }
    }
  }

  useEffect(() => {
    supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          setSeasonId(data.id);
        }
      });
  }, []);

  useEffect(() => {
    const syncViewport = () => setViewportWidth(window.innerWidth);
    syncViewport();
    window.addEventListener('resize', syncViewport);

    return () => {
      window.removeEventListener('resize', syncViewport);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (photoDraft?.previewKind === 'object') {
        URL.revokeObjectURL(photoDraft.previewUrl);
      }
      if (credentialPreview.imageUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(credentialPreview.imageUrl);
      }
    };
  }, [credentialPreview.imageUrl, photoDraft]);

  const { data: selectedSeason } = useQuery({
    queryKey: ['season-detail', seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      const { data } = await supabase
        .from('seasons')
        .select('id, name, category')
        .eq('id', seasonId!)
        .single();
      return data;
    },
  });

  const { data: teams = [], isLoading } = useQuery<Team[]>({
    queryKey: ['teams', seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('season_id', seasonId!)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: players = [] } = useQuery<Player[]>({
    queryKey: ['players', seasonId],
    enabled: teams.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('players')
        .select('*')
        .in('team_id', teams.map((team) => team.id));
      return data ?? [];
    },
  });

  const { data: credentials = [] } = useQuery<PlayerCredential[]>({
    queryKey: ['player-credentials', seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      const response = await fetch(`/api/admin/season-player-credentials?seasonId=${seasonId}`);
      const payload = (await parseJsonResponse(response)) as {
        credentials?: PlayerCredential[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? 'No se pudieron cargar las credenciales de la temporada.');
      }

      return payload.credentials ?? [];
    },
  });

  const credentialByPlayer = new Map<number, PlayerCredential>();
  for (const credential of credentials) {
    if (!credentialByPlayer.has(credential.player_id)) {
      credentialByPlayer.set(credential.player_id, credential);
    }
  }

  async function issueCredentialForPlayer(playerId: number) {
    const response = await fetch('/api/admin/issue-player-credential', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerId,
        seasonId,
      }),
    });

    const payload = await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(payload.error ?? 'No se pudo emitir la credencial del jugador.');
    }

    return payload as PlayerCredentialMutationResult;
  }

  async function reissueCredentialForPlayer(playerId: number, reason: string) {
    const response = await fetch('/api/admin/reissue-player-credential', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerId,
        reason,
        seasonId,
      }),
    });

    const payload = await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(payload.error ?? 'No se pudo reemitir la credencial del jugador.');
    }

    return payload as PlayerCredentialMutationResult;
  }

  async function revokeCredentialForPlayer(playerId: number, reason: string) {
    const response = await fetch('/api/admin/revoke-player-credential', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerId,
        reason,
        seasonId,
      }),
    });

    const payload = await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(payload.error ?? 'No se pudo revocar la credencial del jugador.');
    }

    return payload as { credential: PlayerCredential | null; revoked: boolean };
  }

  async function issueMissingCredentialsInBulk(teamId?: number) {
    const response = await fetch('/api/admin/bulk-issue-player-credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        seasonId,
        teamId,
      }),
    });

    const payload = (await parseJsonResponse(response)) as {
      eligibleCount?: number;
      error?: string;
      issuedCount?: number;
      scopeLabel?: string;
      skippedCount?: number;
    };

    if (!response.ok) {
      throw new Error(payload.error ?? 'No se pudieron emitir las credenciales pendientes.');
    }

    return {
      eligibleCount: payload.eligibleCount ?? 0,
      issuedCount: payload.issuedCount ?? 0,
      scopeLabel: payload.scopeLabel ?? 'la seleccion actual',
      skippedCount: payload.skippedCount ?? 0,
    } satisfies BulkCredentialIssueResult;
  }

  async function openCredentialPreview(player: Player) {
    const credential = getPlayerCredential(player.id);
    const team = teams.find((row) => row.id === player.team_id);

    if (!credential) {
      message.error('Este jugador todavía no tiene credencial emitida.');
      return;
    }

    if (!team || !selectedSeason) {
      message.error('No se encontraron los datos del equipo o temporada para la credencial.');
      return;
    }

    try {
      replaceCredentialPreview({
        imageUrl: credentialPreview.imageUrl,
        loading: true,
        open: true,
      });

      const imageUrl = await renderCredentialImage({
        category: player.category ?? selectedSeason.category ?? 'Categoría',
        credentialCode: credential.credential_code,
        issuedAt: credential.issued_at,
        number: player.number,
        photoUrl: player.photo_url ?? null,
        playerName: player.name,
        seasonName: selectedSeason.name,
        statusLabel: getCredentialStatusLabel(credential.status),
        teamName: team.name,
        verifyUrl: `${window.location.origin}/verificar/${credential.verify_token}`,
      });

      replaceCredentialPreview({
        imageUrl,
        loading: false,
        open: true,
      });
    } catch (error) {
      replaceCredentialPreview({
        imageUrl: null,
        loading: false,
        open: false,
      });
      message.error(
        error instanceof Error
          ? error.message
          : 'No se pudo generar la credencial visual.'
      );
    }
  }

  function downloadCredentialPreview() {
    if (!credentialPreview.imageUrl || !editingPlayer) {
      return;
    }

    const link = document.createElement('a');
    link.href = credentialPreview.imageUrl;
    link.download = `credencial_${editingPlayer.name.replace(/\s+/g, '_')}.png`;
    link.click();
  }

  const saveTeam = useMutation({
    mutationFn: async (values: Partial<Team>) => {
      const payload = {
        ...values,
        season_id: seasonId!,
        status: values.status ?? 'Activo',
      };

      if (editingTeam) {
        const { error } = await supabase
          .from('teams')
          .update(payload)
          .eq('id', editingTeam.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('teams').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] });
      message.success(editingTeam ? 'Equipo actualizado' : 'Equipo creado');
      setTeamModal(false);
      setEditingTeam(null);
      teamForm.resetFields();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const deleteTeam = useMutation({
    mutationFn: async (id: number) => {
      const { data: teamMatches } = await supabase
        .from('matches')
        .select('id')
        .or(`home_team_id.eq.${id},away_team_id.eq.${id}`);

      const matchIds = (teamMatches ?? []).map((match: { id: number }) => match.id);

      if (matchIds.length > 0) {
        const { error: statsError } = await supabase
          .from('player_match_stats')
          .delete()
          .in('match_id', matchIds);
        if (statsError) throw statsError;
      }

      if (matchIds.length > 0) {
        const { error: matchError } = await supabase
          .from('matches')
          .delete()
          .in('id', matchIds);
        if (matchError) throw matchError;
      }

      const { error } = await supabase.from('teams').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams', 'players'] });
      message.success('Equipo y todos sus datos eliminados correctamente');
    },
    onError: (error: Error) => message.error(error.message),
  });

  const bulkIssueCredentials = useMutation({
    mutationFn: async (teamId?: number) => issueMissingCredentialsInBulk(teamId),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['player-credentials'] });
      qc.invalidateQueries({ queryKey: ['players'] });
      setCredentialOverrides(new Map());

      if (result.issuedCount === 0) {
        message.info(
          `No habia credenciales pendientes en ${result.scopeLabel}. ${result.skippedCount} ya estaban vigentes.`
        );
        return;
      }

      message.success(
        `Se emitieron ${result.issuedCount} credenciales en ${result.scopeLabel}. ${result.skippedCount} ya estaban vigentes.`
      );
    },
    onError: (error: Error) => message.error(error.message),
  });

  const downloadTeamCredentialsPdf = useMutation({
    mutationFn: async () => {
      const team = teams.find((row) => row.id === playerModal);

      if (!team || !selectedSeason) {
        throw new Error('No se encontraron los datos del equipo o temporada.');
      }

      const printablePlayers = selectedTeamActivePlayers
        .map((player) => {
          const credential = getPlayerCredential(player.id);

          if (!credential) {
            return null;
          }

          return {
            category: player.category ?? selectedSeason.category ?? team.category ?? 'Libre',
            credentialCode: credential.credential_code,
            fileSafeName: player.name,
            issuedAt: credential.issued_at,
            number: player.number,
            photoUrl: player.photo_url ?? null,
            playerName: player.name,
            seasonName: selectedSeason.name,
            statusLabel: getCredentialStatusLabel(credential.status),
            teamName: team.name,
            verifyUrl: `${window.location.origin}/verificar/${credential.verify_token}`,
          };
        })
        .filter((credential): credential is NonNullable<typeof credential> => credential !== null);

      await generateTeamCredentialPdf({
        credentials: printablePlayers,
        teamName: team.name,
      });

      return printablePlayers.length;
    },
    onSuccess: (count) => {
      message.success(`PDF generado con ${count} credenciales.`);
    },
    onError: (error: Error) => message.error(error.message),
  });

  const savePlayer = useMutation({
    mutationFn: async (values: PlayerFormValues) => {
      const previousPublicId = editingPlayer?.photo_public_id ?? null;
      const nextPublicId = photoDraft?.publicId ?? null;
      const trimmedName = values.name.trim();
      const payload = {
        name: trimmedName,
        number: values.number ?? null,
        photo_url: photoDraft?.photoUrl ?? null,
        photo_thumb_url: photoDraft?.thumbUrl ?? null,
        photo_public_id: nextPublicId,
        photo_provider: photoDraft?.provider ?? null,
      };

      if (editingPlayer) {
        const { error } = await supabase
          .from('players')
          .update(payload)
          .eq('id', editingPlayer.id);
        if (error) throw error;

        if (
          previousPublicId &&
          previousPublicId !== nextPublicId &&
          editingPlayer.photo_provider === 'cloudinary'
        ) {
          try {
            await deleteCloudinaryAsset(previousPublicId);
          } catch {
            message.warning('La foto anterior se guardo en BD, pero no se pudo limpiar en Cloudinary.');
          }
        }

        const currentCredential = getPlayerCredential(editingPlayer.id);
        const credentialNeedsReissue =
          editingPlayer.name.trim() !== trimmedName ||
          (editingPlayer.number ?? null) !== (values.number ?? null) ||
          (editingPlayer.photo_url ?? null) !== (photoDraft?.photoUrl ?? null) ||
          (editingPlayer.photo_public_id ?? null) !== nextPublicId;

        if (currentCredential && credentialNeedsReissue) {
          const result = await reissueCredentialForPlayer(
            editingPlayer.id,
            'Datos del jugador actualizados'
          );

          setCredentialOverrides((current) => {
            const next = new Map(current);
            next.set(editingPlayer.id, result.credential);
            return next;
          });
        } else if (!currentCredential) {
          const result = await issueCredentialForPlayer(editingPlayer.id);

          setCredentialOverrides((current) => {
            const next = new Map(current);
            next.set(editingPlayer.id, result.credential);
            return next;
          });
        }
      } else {
        const activeCount = players.filter(
          (player) => player.team_id === playerModal && player.is_active
        ).length;

        if (activeCount >= 99) {
          throw new Error('Límite excedido: El equipo ya tiene 99 jugadores activos.');
        }

        const { data, error } = await supabase
          .from('players')
          .insert({
            ...payload,
            team_id: playerModal,
            category: selectedSeason?.category ?? 'Libre',
            is_active: true,
          })
          .select('id')
          .single();
        if (error) throw error;
        const result = await issueCredentialForPlayer(data.id);

        setCredentialOverrides((current) => {
          const next = new Map(current);
          next.set(data.id, result.credential);
          return next;
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['players'] });
      qc.invalidateQueries({ queryKey: ['player-credentials'] });
      message.success(editingPlayer ? 'Jugador actualizado y credencial sincronizada' : 'Jugador agregado con foto y credencial emitida');
      resetPlayerEditorState();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const manualReissueCredential = useMutation({
    mutationFn: async (player: Player) =>
      reissueCredentialForPlayer(player.id, 'Reemision manual desde administracion'),
    onSuccess: (result) => {
      if (!editingPlayer) {
        return;
      }

      setCredentialOverrides((current) => {
        const next = new Map(current);
        next.set(editingPlayer.id, result.credential);
        return next;
      });
      qc.invalidateQueries({ queryKey: ['player-credentials'] });
      message.success('Credencial reemitida correctamente');
    },
    onError: (error: Error) => message.error(error.message),
  });

  const togglePlayer = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      const { error } = await supabase.from('players').update({ is_active }).eq('id', id);

      if (error) {
        throw error;
      }

      if (!is_active) {
        const result = await revokeCredentialForPlayer(id, 'Jugador dado de baja');

        if (result.credential) {
          const revokedCredential = result.credential;
          setCredentialOverrides((current) => {
            const next = new Map(current);
            next.set(id, revokedCredential);
            return next;
          });
        }
      }
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['players'] });
      qc.invalidateQueries({ queryKey: ['player-credentials'] });
      message.success(variables.is_active ? 'Jugador reactivado' : 'Jugador marcado como baja y credencial revocada');
    },
    onError: (error: Error) => message.error(error.message),
  });

  const deletePlayer = useMutation({
    mutationFn: async (player: Player) => {
      const previousPublicId = player.photo_public_id ?? null;
      const previousProvider = player.photo_provider ?? null;
      const { error } = await supabase.from('players').delete().eq('id', player.id);

      if (error) {
        if (error.code === '23503') {
          const { error: updateError } = await supabase
            .from('players')
            .update({ is_active: false })
            .eq('id', player.id);
          if (updateError) throw updateError;
          const revokeResult = await revokeCredentialForPlayer(player.id, 'Jugador marcado como baja');

          if (revokeResult.credential) {
            const revokedCredential = revokeResult.credential;
            setCredentialOverrides((current) => {
              const next = new Map(current);
              next.set(player.id, revokedCredential);
              return next;
            });
          }
          return 'soft-deleted';
        }
        throw error;
      }

      if (previousPublicId && previousProvider === 'cloudinary') {
        try {
          await deleteCloudinaryAsset(previousPublicId);
        } catch {
          message.warning('El jugador se elimino, pero su foto no pudo borrarse de Cloudinary.');
        }
      }

      return 'deleted';
    },
    onSuccess: (status) => {
      qc.invalidateQueries({ queryKey: ['players'] });
      if (status === 'soft-deleted') {
        message.info(
          'El jugador tiene estadísticas guardadas. Fue marcado como Baja (Inactivo) para no afectar el historial del equipo.',
          5
        );
      } else {
        message.success('Jugador eliminado permanentemente');
      }
    },
    onError: (error: Error) => message.error(error.message),
  });

  const teamCols = [
    {
      title: 'Equipo',
      dataIndex: 'name',
      key: 'name',
      render: (value: string, row: Team) => (
        <span>
          <Text strong>{value}</Text>
          {row.status !== 'Activo' && (
            <Tag color="red" style={{ marginLeft: 6 }}>
              {row.status}
            </Tag>
          )}
          {row.defaults_count >= 4 && (
            <Tag color="orange" style={{ marginLeft: 4 }}>
              ≥4 WO
            </Tag>
          )}
        </span>
      ),
    },
    {
      title: 'Categoría',
      dataIndex: 'category',
      key: 'category',
      width: 100,
    },
    {
      title: 'Permisos',
      dataIndex: 'permissions_used',
      key: 'permissions_used',
      width: 85,
      align: 'center' as const,
    },
    {
      title: 'WO',
      dataIndex: 'defaults_count',
      key: 'defaults_count',
      width: 55,
      align: 'center' as const,
    },
    {
      title: '',
      key: 'actions',
      width: 130,
      render: (_: unknown, row: Team) => (
        <Space>
          <Button size="small" icon={<UserAddOutlined />} onClick={() => openNewPlayerModal(row.id)} />
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingTeam(row);
              teamForm.setFieldsValue(row);
              setTeamModal(true);
            }}
          />
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() =>
              modal.confirm({
                title: `¿Eliminar "${row.name}"?`,
                content: (
                  <span>
                    Se eliminarán en cascada:
                    <br />
                    <b>• Todos los partidos donde participó el equipo</b>
                    <br />
                    <b>• Todas las estadísticas de esos partidos</b>
                    <br />
                    <b>• Todos los jugadores del equipo</b>
                    <br />
                    Esta acción <b>no se puede deshacer</b>.
                  </span>
                ),
                okText: 'Sí, eliminar todo',
                okType: 'danger',
                cancelText: 'Cancelar',
                onOk: () => deleteTeam.mutate(row.id),
              })
            }
          />
        </Space>
      ),
    },
  ];

  const selectedTeamPlayers = players.filter((player) => player.team_id === playerModal);
  const activeSeasonPlayers = players.filter((player) => player.is_active);
  const activeSeasonCredentialCount = activeSeasonPlayers.filter((player) =>
    Boolean(getPlayerCredential(player.id))
  ).length;
  const pendingSeasonCredentialCount = activeSeasonPlayers.length - activeSeasonCredentialCount;
  const selectedTeamActivePlayers = selectedTeamPlayers.filter((player) => player.is_active);
  const selectedTeamCredentialCount = selectedTeamActivePlayers.filter((player) =>
    Boolean(getPlayerCredential(player.id))
  ).length;
  const pendingSelectedTeamCredentialCount =
    selectedTeamActivePlayers.length - selectedTeamCredentialCount;
  const credentialModalWidth = viewportWidth < 640
    ? viewportWidth - 16
    : viewportWidth < 1024
      ? viewportWidth - 32
      : Math.min(viewportWidth - 24, 1460);

  return (
    <AdminLayout>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <Title level={4} style={{ color: '#FAAD14', margin: 0 }}>
            👥 Equipos
          </Title>
          <SeasonSelector value={seasonId} onChange={setSeasonId} style={{ marginTop: 8 }} />
        </div>
        <Space wrap>
          <Button
            onClick={() => bulkIssueCredentials.mutate(undefined)}
            loading={bulkIssueCredentials.isPending}
            disabled={!seasonId || pendingSeasonCredentialCount <= 0}
          >
            Emitir pendientes ({pendingSeasonCredentialCount})
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!seasonId}
            onClick={() => {
              setEditingTeam(null);
              teamForm.resetFields();
              teamForm.setFieldsValue({
                category: selectedSeason?.category ?? 'Libre',
                status: 'Activo',
                permissions_used: 0,
                defaults_count: 0,
              });
              setTeamModal(true);
            }}
          >
            Nuevo Equipo
          </Button>
        </Space>
      </div>

      {!!seasonId && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title="Control de credenciales"
          description={`${activeSeasonCredentialCount} de ${activeSeasonPlayers.length} jugadores activos ya tienen credencial vigente. ${pendingSeasonCredentialCount} siguen pendientes en esta temporada.`}
        />
      )}

      {!seasonId ? (
        <Text style={{ color: '#555' }}>Selecciona una temporada para ver los equipos.</Text>
      ) : (
        <Table
          dataSource={teams}
          columns={teamCols}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={false}
          scroll={{ x: 480 }}
          expandable={{
            expandedRowRender: (team: Team) => {
              const teamPlayers = players.filter((player) => player.team_id === team.id);

              return (
                <div style={{ padding: '6px 0' }}>
                  <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 6 }}>
                    {teamPlayers.length} jugadores
                  </Text>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {teamPlayers.map((player) => (
                      <Tag
                        key={player.id}
                        color={player.is_active ? 'blue' : 'default'}
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                          togglePlayer.mutate({
                            id: player.id,
                            is_active: !player.is_active,
                          })
                        }
                      >
                        #{player.number ?? '?'} {player.name} {!player.is_active && '(baja)'}
                        {getPlayerCredential(player.id) && (
                          <span style={{ marginLeft: 6, color: '#52c41a' }}>• credencial</span>
                        )}
                        {player.photo_url && (
                          <span style={{ marginLeft: 6, color: '#91caff' }}>• foto</span>
                        )}
                        <span
                          style={{ marginLeft: 6, color: '#ff4d4f', cursor: 'pointer' }}
                          onClick={(event) => {
                            event.stopPropagation();
                            modal.confirm({
                              title: `¿Dar de baja a ${player.name}?`,
                              content:
                                'Si el jugador no tiene partidos, se eliminará permanentemente. Si ya tiene puntos o asistencias, se marcará como Baja (inactivo) para proteger el historial del equipo.',
                              okText: 'Confirmar',
                              okType: 'danger',
                              cancelText: 'Cancelar',
                              onOk: () => deletePlayer.mutate(player),
                            });
                          }}
                        >
                          ×
                        </span>
                      </Tag>
                    ))}
                    {teamPlayers.length === 0 && (
                      <Text style={{ color: '#555' }}>Sin jugadores</Text>
                    )}
                  </div>
                </div>
              );
            },
          }}
        />
      )}

      <Modal
        title={editingTeam ? 'Editar Equipo' : 'Nuevo Equipo'}
        open={teamModal}
        onCancel={() => {
          setTeamModal(false);
          setEditingTeam(null);
        }}
        onOk={() => teamForm.submit()}
        confirmLoading={saveTeam.isPending}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={teamForm} layout="vertical" onFinish={(values) => saveTeam.mutate(values)}>
          <Form.Item name="name" label="Nombre del equipo" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="category" label="Categoría" rules={[{ required: true }]}>
            <Select options={CATEGORIES.map((category) => ({ label: category, value: category }))} />
          </Form.Item>
          <Form.Item name="status" label="Estatus">
            <Select
              options={[
                { label: 'Activo', value: 'Activo' },
                { label: 'Dado de Baja', value: 'Dado de Baja' },
              ]}
            />
          </Form.Item>
          <Form.Item name="permissions_used" label="Permisos usados">
            <Input type="number" min={0} max={3} />
          </Form.Item>
          <Form.Item name="defaults_count" label="W.O. acumulados">
            <Input type="number" min={0} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Jugadores – ${teams.find((team) => team.id === playerModal)?.name ?? ''}`}
        open={playerModal !== null}
        onCancel={() => {
          setPlayerModal(null);
          resetPlayerEditorState();
        }}
        footer={null}
        width={760}
        style={{ top: 20 }}
      >
        <Collapse
          size="small"
          style={{ marginBottom: 12 }}
          defaultActiveKey={['1']}
          items={[
            {
              key: '1',
              label: `Activos (${selectedTeamPlayers.filter((player) => player.is_active).length} registrados - Límite temporal apagado)`,
              children: (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selectedTeamPlayers
                    .filter((player) => player.is_active)
                    .map((player) => (
                      <Tag
                        key={player.id}
                        color="blue"
                        icon={<EditOutlined />}
                        style={{ cursor: 'pointer', padding: '4px 8px' }}
                        onClick={() => openPlayerForEdit(player)}
                      >
                        #{player.number ?? '?'} {player.name}
                      </Tag>
                    ))}
                  {selectedTeamPlayers.filter((player) => player.is_active).length === 0 && (
                    <Text style={{ color: '#555' }}>Sin jugadores activos</Text>
                  )}
                </div>
              ),
            },
            {
              key: '2',
              label: `Bajas / Inactivos (${selectedTeamPlayers.filter((player) => !player.is_active).length})`,
              children: (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selectedTeamPlayers
                    .filter((player) => !player.is_active)
                    .map((player) => (
                      <Tag
                        key={player.id}
                        color="default"
                        icon={<EditOutlined />}
                        style={{ cursor: 'pointer', padding: '4px 8px' }}
                        onClick={() => openPlayerForEdit(player)}
                      >
                        #{player.number ?? '?'} {player.name}
                      </Tag>
                    ))}
                  {selectedTeamPlayers.filter((player) => !player.is_active).length === 0 && (
                    <Text style={{ color: '#555', fontSize: 12 }}>Sin bajas</Text>
                  )}
                </div>
              ),
            },
          ]}
        />

        <div style={{ borderTop: '1px solid #333', paddingTop: 16, marginTop: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 12 }}>
            {editingPlayer ? `Editar jugador: ${editingPlayer.name}` : 'Inscribir nuevo jugador'}
          </Text>

          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            title="Fase 3 activa"
            description="La foto se sube a Cloudinary y ahora ya puedes previsualizar, descargar y verificar la credencial digital con QR."
          />

          <Alert
            type="success"
            showIcon
            style={{ marginBottom: 12 }}
            title="Credenciales del equipo"
            description={`${selectedTeamCredentialCount} de ${selectedTeamActivePlayers.length} jugadores activos ya tienen credencial vigente. ${pendingSelectedTeamCredentialCount} siguen pendientes.`}
            action={
              <Space wrap>
                <Button
                  size="small"
                  loading={bulkIssueCredentials.isPending}
                  disabled={!playerModal || pendingSelectedTeamCredentialCount <= 0}
                  onClick={() => bulkIssueCredentials.mutate(playerModal ?? undefined)}
                >
                  Emitir pendientes
                </Button>
                <Button
                  size="small"
                  loading={downloadTeamCredentialsPdf.isPending}
                  disabled={!playerModal || selectedTeamCredentialCount <= 0}
                  onClick={() => downloadTeamCredentialsPdf.mutate()}
                >
                  PDF equipo
                </Button>
              </Space>
            }
          />

          {editingPlayer && getPlayerCredential(editingPlayer.id) && (
            <div
              style={{
                marginBottom: 12,
                padding: 12,
                border: '1px solid #2a2a2a',
                borderRadius: 8,
                background: '#111',
              }}
            >
              <Text style={{ color: '#888', display: 'block', fontSize: 12 }}>
                Credencial actual
              </Text>
              <Space wrap size={[8, 8]} style={{ marginTop: 6 }}>
                <Tag color="gold">{getPlayerCredential(editingPlayer.id)?.credential_code}</Tag>
                <Tag color="green">
                  {getCredentialStatusLabel(getPlayerCredential(editingPlayer.id)!.status)}
                </Tag>
                <Tag color="blue">v{getPlayerCredential(editingPlayer.id)?.version}</Tag>
                <Tag color="cyan">
                  {dayjs(getPlayerCredential(editingPlayer.id)?.issued_at).format('DD/MM/YYYY')}
                </Tag>
              </Space>
              <Space wrap style={{ marginTop: 10 }}>
                <Button size="small" onClick={() => openCredentialPreview(editingPlayer)}>
                  Ver credencial
                </Button>
                <Button
                  size="small"
                  loading={manualReissueCredential.isPending}
                  onClick={() => manualReissueCredential.mutate(editingPlayer)}
                >
                  Reemitir credencial
                </Button>
                <Button
                  size="small"
                  onClick={() =>
                    window.open(
                      `/verificar/${getPlayerCredential(editingPlayer.id)?.verify_token}`,
                      '_blank',
                      'noopener,noreferrer'
                    )
                  }
                >
                  Abrir verificación
                </Button>
              </Space>
            </div>
          )}

          <Form
            form={playerForm}
            layout="vertical"
            onFinish={(values) => savePlayer.mutate(values)}
          >
            <Form.Item
              name="name"
              label="Nombre completo"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: 'Captura el nombre del jugador.',
                },
              ]}
            >
              <Input />
            </Form.Item>

            <Space style={{ width: '100%', alignItems: 'flex-start' }} wrap>
              <Form.Item name="number" label="Dorsal">
                <Input type="number" min={0} max={99} style={{ width: 100 }} />
              </Form.Item>

              <div
                style={{
                  minWidth: 260,
                  flex: 1,
                  border: '1px dashed #3a3a3a',
                  borderRadius: 12,
                  padding: 12,
                  background: '#101010',
                }}
              >
                <Text style={{ color: '#d9d9d9', display: 'block', marginBottom: 10 }}>
                  Foto del jugador
                </Text>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelected}
                  style={{ display: 'none' }}
                />

                {photoDraft ? (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div
                      style={{
                        position: 'relative',
                        width: 88,
                        height: 88,
                        overflow: 'hidden',
                        borderRadius: 12,
                        border: '1px solid #2a2a2a',
                      }}
                    >
                      <Image
                        src={photoDraft.previewUrl}
                        alt="Preview del jugador"
                        fill
                        unoptimized
                        sizes="88px"
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <Space wrap size={[8, 8]} style={{ marginBottom: 8 }}>
                        <Tag color="blue">{photoDraft.provider ?? 'sin proveedor'}</Tag>
                        {photoDraft.publicId && <Tag color="cyan">Cloudinary</Tag>}
                      </Space>
                      <Text style={{ color: '#888', fontSize: 12, display: 'block' }}>
                        La miniatura ya está optimizada. Puedes reemplazarla o quitarla antes de guardar.
                      </Text>
                    </div>
                  </div>
                ) : (
                  <Text style={{ color: '#666', fontSize: 12, display: 'block', marginBottom: 10 }}>
                    Sube una foto frontal, clara y ligera. El sistema la comprime antes de enviarla.
                  </Text>
                )}

                <Space wrap style={{ marginTop: 12 }}>
                  <Button
                    icon={<UploadOutlined />}
                    loading={isUploadingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {photoDraft ? 'Reemplazar foto' : 'Subir foto'}
                  </Button>
                  {photoDraft && (
                    <Button danger onClick={() => void removeCurrentPhoto()}>
                      Quitar foto
                    </Button>
                  )}
                </Space>
              </div>

              <Form.Item label=" ">
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={savePlayer.isPending}
                    disabled={
                      isUploadingPhoto ||
                      (!editingPlayer &&
                        selectedTeamPlayers.filter((player) => player.is_active).length >= 99)
                    }
                  >
                    {editingPlayer ? 'Actualizar' : 'Agregar'}
                  </Button>
                  {editingPlayer && (
                    <>
                      <Button onClick={() => resetPlayerEditorState()}>Cancelar</Button>
                      <Button
                        danger
                        onClick={() => {
                          modal.confirm({
                            title: `¿Eliminar a ${editingPlayer.name}?`,
                            content:
                              'Si el jugador no tiene partidos se borrará, si no, se marcará como baja.',
                            okText: 'Eliminar',
                            okType: 'danger',
                            cancelText: 'Cancelar',
                            onOk: () => {
                              deletePlayer.mutate(editingPlayer);
                              resetPlayerEditorState();
                            },
                          });
                        }}
                      >
                        Eliminar
                      </Button>
                    </>
                  )}
                </Space>
              </Form.Item>
            </Space>
          </Form>
        </div>
      </Modal>

      <Modal
        title={editingPlayer ? `Credencial – ${editingPlayer.name}` : 'Credencial digital'}
        open={credentialPreview.open}
        onCancel={() =>
          replaceCredentialPreview({
            imageUrl: null,
            loading: false,
            open: false,
          })
        }
        footer={
          <Space wrap style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button
              onClick={() =>
                replaceCredentialPreview({
                  imageUrl: null,
                  loading: false,
                  open: false,
                })
              }
            >
              Cerrar
            </Button>
            <Button
              type="primary"
              disabled={!credentialPreview.imageUrl}
              onClick={downloadCredentialPreview}
            >
              Descargar PNG
            </Button>
          </Space>
        }
        width={credentialModalWidth}
        style={{ top: viewportWidth < 640 ? 8 : 20 }}
      >
        {credentialPreview.loading ? (
          <div style={{ padding: '64px 0', textAlign: 'center', color: '#bbb' }}>
            Generando credencial...
          </div>
        ) : credentialPreview.imageUrl ? (
          <div
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              padding: viewportWidth < 640 ? 8 : 16,
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                minHeight: viewportWidth < 640 ? 280 : 580,
                aspectRatio: '1586 / 992',
                borderRadius: viewportWidth < 640 ? 18 : 24,
                overflow: 'hidden',
                border: '1px solid rgba(245,166,35,0.2)',
                background: '#09111a',
                boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
              }}
            >
              <Image
                src={credentialPreview.imageUrl}
                alt="Credencial digital"
                fill
                unoptimized
                sizes="(max-width: 640px) calc(100vw - 48px), (max-width: 1024px) calc(100vw - 96px), 1200px"
                style={{ objectFit: 'contain', background: '#09111a' }}
              />
            </div>
          </div>
        ) : (
          <div style={{ padding: '48px 0', textAlign: 'center', color: '#bbb' }}>
            No se pudo generar la previsualización.
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProfileRow {
  id: string;
  display_name: string | null;
  avatar_path: string | null;
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<{ profile: ProfileRow | null; email: string | null; avatarUrl: string | null }> => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return { profile: null, email: null, avatarUrl: null };
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_path")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      let avatarUrl: string | null = null;
      if (data?.avatar_path) {
        const { data: signed } = await supabase.storage
          .from("avatars")
          .createSignedUrl(data.avatar_path, 60 * 60);
        avatarUrl = signed?.signedUrl ?? null;
      }
      return { profile: (data as ProfileRow) ?? null, email: user.email ?? null, avatarUrl };
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { display_name?: string | null; avatar_path?: string | null }) => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Sem sessão");
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, ...values })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export function useUploadAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Sem sessão");
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { error: profErr } = await supabase
        .from("profiles")
        .upsert({ id: user.id, avatar_path: path });
      if (profErr) throw profErr;
      return path;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // 🚨 ESTA LÍNEA DEBE DECIR /completar-perfil
          redirectTo: `${window.location.origin}/completar-perfil`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      console.error('Error con Google:', err);
      setError('No se pudo conectar con Google. Intenta de nuevo.');
      setLoading(false);
    }
  };

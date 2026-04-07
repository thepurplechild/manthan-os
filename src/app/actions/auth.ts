'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isRedirectError } from 'next/dist/client/components/redirect-error'

export async function login(formData: FormData) {
  try {
    const supabase = await createClient()

    const data = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
      const encoded = encodeURIComponent(error.message || 'invalid_credentials')
      redirect(`/login?error=${encoded}`)
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
  } catch (error) {
    if (isRedirectError(error)) {
      throw error
    }
    console.error('Login action failed:', error)
    const message =
      error instanceof Error && error.message.toLowerCase().includes('fetch failed')
        ? 'Auth service unreachable. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.'
        : error instanceof Error
          ? error.message
          : 'Unexpected login error'
    redirect(`/login?error=${encodeURIComponent(message)}`)
  }
}

export async function signup(formData: FormData) {
  try {
    const supabase = await createClient()

    const data = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    }

    const { data: signUpData, error } = await supabase.auth.signUp(data)

    if (error) {
      const encoded = encodeURIComponent(error.message || 'signup_failed')
      redirect(`/signup?error=${encoded}`)
    }

    // If email confirmation is enabled, user may not get a session immediately.
    // In that case, return them to login with a clear next step.
    if (!signUpData.session) {
      revalidatePath('/', 'layout')
      redirect('/login?message=check_email_to_confirm')
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
  } catch (error) {
    if (isRedirectError(error)) {
      throw error
    }
    console.error('Signup action failed:', error)
    const message =
      error instanceof Error && error.message.toLowerCase().includes('fetch failed')
        ? 'Auth service unreachable. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.'
        : error instanceof Error
          ? error.message
          : 'Unexpected signup error'
    redirect(`/signup?error=${encodeURIComponent(message)}`)
  }
}

export async function logout() {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    redirect('/dashboard?error=logout_failed')
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function getUser() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    return null
  }

  return user
}

export async function getUserProfile() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return {
    id: user.id,
    email: user.email || null,
    fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
    avatarUrl: user.user_metadata?.avatar_url || undefined,
  }
}
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  const fullName = formData.get('fullName') as string

  if (!fullName || fullName.trim().length === 0) {
    return { error: 'Full name is required' }
  }

  // Update user metadata
  const { error: updateError } = await supabase.auth.updateUser({
    data: { full_name: fullName.trim() }
  })

  if (updateError) {
    return { error: `Failed to update profile: ${updateError.message}` }
  }

  revalidatePath('/dashboard/settings')
  return { success: true, message: 'Profile updated successfully' }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  const currentPassword = formData.get('currentPassword') as string
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  // Validation
  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: 'All password fields are required' }
  }

  if (newPassword.length < 6) {
    return { error: 'New password must be at least 6 characters long' }
  }

  if (newPassword !== confirmPassword) {
    return { error: 'New passwords do not match' }
  }

  // Verify current password by attempting to sign in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  })

  if (signInError) {
    return { error: 'Current password is incorrect' }
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword
  })

  if (updateError) {
    return { error: `Failed to update password: ${updateError.message}` }
  }

  revalidatePath('/dashboard/settings')
  return { success: true, message: 'Password updated successfully' }
}
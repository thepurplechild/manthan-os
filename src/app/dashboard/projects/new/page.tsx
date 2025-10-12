import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NewProjectForm } from '@/components/projects/NewProjectForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function NewProjectPage() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/dashboard/projects">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Link>
      </Button>

      <h1 className="text-3xl font-bold mb-2">Create New Project</h1>
      <p className="text-muted-foreground mb-8">
        Start organizing your creative assets into a new project
      </p>

      <NewProjectForm />
    </div>
  );
}
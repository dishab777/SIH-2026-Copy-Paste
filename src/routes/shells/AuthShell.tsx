import { Shell } from '@/components/layout/Shell';

/**
 * The shell for signing in and registering.
 *
 * These four pages used to sit inside the public shell, which meant the bar
 * above a sign-in form carried the whole site — demand board, challenges,
 * results, solutions, templates, transparency — every one of them a working
 * link. A door that offers seven ways not to go through it is not a door.
 *
 * It was worse for somebody already signed in: the bar handed them the full
 * document-room navigation from the one screen whose entire purpose is to
 * change who they are, and their old identity stayed in the account menu while
 * they were choosing a new one.
 *
 * So the bar here carries the government strip, the language control and one
 * way back to the demand board. Nothing else.
 */
export function AuthShell() {
  return <Shell links={[]} bare />;
}

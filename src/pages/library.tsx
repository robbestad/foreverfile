import { LibraryView } from "@/components/library-view";
import { PageShell } from "@/components/page-shell";
import type { PageProps } from "@/types";
import { create } from "svenjs";

export const LibraryPage = create<PageProps>({
  render() {
    return (
      <PageShell>
        <LibraryView />
      </PageShell>
    );
  },
});

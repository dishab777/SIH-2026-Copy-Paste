import { useState, type ReactNode } from 'react';
import type { GateId } from '@/config/gates';
import { GateLadder, GateSummary } from '@/components/domain/GateLadder';
import { EvidenceDock, EvidenceDockSheet, DockButton } from '@/components/domain/EvidenceDock';
import { Sheet } from '@/components/ui/Overlay';
import type { AuditEvent, Evidence, GateRecord, WaitingItem } from '@/types/models';

export interface CaseWorkspaceProps {
  gates: GateRecord[];
  currentGate: GateId;
  ownerNames: Record<string, string>;
  evidence: Evidence[];
  audit: AuditEvent[];
  next: WaitingItem[];
  linked: { caseId: string; label: string; to: string; detail?: string }[];
  children: ReactNode;
}

/**
 * The three-column case shell: dwell rail, working column, evidence dock.
 * Below 1024px the rail becomes a horizontal strip; below 768px it becomes a
 * one-line summary that opens a sheet, and the dock becomes a bottom sheet.
 */
export function CaseWorkspace({
  gates,
  currentGate,
  ownerNames,
  evidence,
  audit,
  next,
  linked,
  children,
}: CaseWorkspaceProps) {
  const [dockOpen, setDockOpen] = useState(false);
  const [ladderOpen, setLadderOpen] = useState(false);
  // A dock holding nothing is a third of the screen saying "nothing". It opens
  // itself the moment a case has anything filed against it.
  const [dockCollapsed, setDockCollapsed] = useState(evidence.length === 0);

  return (
    <div className="flex gap-6">
      {/* The rail floats over the working column as you scroll past it, so it
          gets the glass treatment rather than sitting on the page as a slab. */}
      <aside className="hidden w-[208px] shrink-0 xl:block">
        <div className="glass sticky top-20 p-2">
          <GateLadder records={gates} currentGate={currentGate} ownerNames={ownerNames} />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-4 hidden md:block xl:hidden">
          <GateLadder records={gates} currentGate={currentGate} ownerNames={ownerNames} orientation="horizontal" />
        </div>
        <div className="mb-4 md:hidden">
          <GateSummary records={gates} currentGate={currentGate} onOpen={() => setLadderOpen(true)} />
        </div>

        {children}

        <div className="mt-6 lg:hidden">
          <DockButton onClick={() => setDockOpen(true)} count={evidence.length} />
        </div>
      </div>

      <EvidenceDock
        evidence={evidence}
        audit={audit}
        next={next}
        linked={linked}
        collapsed={dockCollapsed}
        onToggle={() => setDockCollapsed((c) => !c)}
      />

      <EvidenceDockSheet
        open={dockOpen}
        onClose={() => setDockOpen(false)}
        evidence={evidence}
        audit={audit}
        next={next}
        linked={linked}
      />

      <Sheet open={ladderOpen} onClose={() => setLadderOpen(false)} title="Gate ladder" side="bottom">
        <GateLadder records={gates} currentGate={currentGate} ownerNames={ownerNames} />
      </Sheet>
    </div>
  );
}

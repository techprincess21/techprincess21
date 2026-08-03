"use client";

// The Getting Started home — the default landing tab. A friendly hub that
// points people at the things they do most, instead of dropping them into a
// data board (or, previously, the Blueprints gallery). Each action just routes
// to an existing surface; no new behavior of its own.

type Board = { id: string; label: string };

type Action = {
  icon: string;
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
};

export default function GettingStarted({
  name,
  description,
  boards,
  canCreateBoard,
  onCreateBoard,
  onGoto,
}: {
  name?: string;
  description?: string;
  boards: Board[];
  canCreateBoard: boolean;
  onCreateBoard: () => void;
  onGoto: (id: string) => void;
}) {
  const firstName = (name ?? "").trim().split(/\s+/)[0];

  const actions: Action[] = [
    {
      icon: "📐",
      title: "Start a project",
      body: "Pick a blueprint — a webinar, blog, or campaign — and open all the cross-team tickets in one click, pre-filled and ready.",
      cta: "Browse blueprints",
      onClick: () => onGoto("blueprints"),
    },
    {
      icon: "⚡",
      title: "Build an automation",
      body: "Define what happens automatically: when a work type hits a status, open the right tickets in the right teams' projects.",
      cta: "Open Automations",
      onClick: () => onGoto("automations"),
    },
  ];
  if (canCreateBoard) {
    actions.push({
      icon: "➕",
      title: "Create a new board",
      body: "Track a new workflow your way — start blank, from a template, or import an existing spreadsheet or Google Sheet.",
      cta: "New board",
      onClick: onCreateBoard,
    });
  }

  return (
    <div className="gs">
      <div className="gs-hero">
        <span className="brand-mark" role="img" aria-label="Goatsana">🐐</span>
        <div>
          <h2 className="gs-title">{firstName ? `Welcome, ${firstName}` : "Welcome to Goatsana"}</h2>
          <p className="gs-sub">{description}</p>
        </div>
      </div>

      <div className="gs-grid">
        {actions.map((a) => (
          <button className="gs-card" key={a.title} onClick={a.onClick}>
            <span className="gs-icon" aria-hidden>{a.icon}</span>
            <span className="gs-card-title">{a.title}</span>
            <span className="gs-card-body">{a.body}</span>
            <span className="gs-card-cta">{a.cta} →</span>
          </button>
        ))}
      </div>

      {boards.length > 0 && (
        <div className="gs-boards">
          <h3 className="gs-boards-title">Your boards</h3>
          <div className="gs-board-chips">
            {boards.map((b) => (
              <button className="gs-board-chip" key={b.id} onClick={() => onGoto(b.id)}>
                {b.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

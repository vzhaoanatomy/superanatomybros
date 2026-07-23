const STEPS = [
  { icon: '1️⃣', text: 'Pick a template below (or "+ New Custom World") and open it to edit.' },
  { icon: '2️⃣', text: 'Paste your vocab list — "Term - Definition" per line, or paste a spreadsheet/CSV straight in.' },
  { icon: '3️⃣', text: 'Click "Publish with Classroom Code" to get a 6-letter code.' },
  { icon: '4️⃣', text: 'Share the code with students — they enter it on their own screen and start playing.' },
];

// First-run onboarding for a teacher who's never used this before — dismissed
// once (see storage.js's dismissTeacherOnboarding) and never shown again on
// this device, so it doesn't nag anyone who already knows the flow.
export default function QuickStartBanner({ onDismiss }) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #2a1f52, #16213a)',
        border: '2px solid #7d3fd6',
        borderRadius: 10,
        padding: '16px 18px',
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <strong style={{ fontSize: 15, color: '#c9a3ff' }}>🚀 Quick Start — live in about 5 minutes</strong>
        <button
          type="button"
          onClick={onDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#9fb0d0',
            cursor: 'pointer',
            fontSize: 13,
            fontFamily: 'inherit',
            padding: '2px 4px',
            flexShrink: 0,
          }}
        >
          ✕ Dismiss
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
        {STEPS.map((step) => (
          <div key={step.text} style={{ display: 'flex', gap: 10, fontSize: 13.5, color: '#dbe3f7', lineHeight: 1.4 }}>
            <span style={{ flexShrink: 0 }}>{step.icon}</span>
            <span>{step.text}</span>
          </div>
        ))}
      </div>
      <p style={{ margin: '12px 0 0', fontSize: 12, color: '#8fa0c4' }}>
        No student accounts, logins, or personal info required — just a nickname and the code.
      </p>
    </div>
  );
}

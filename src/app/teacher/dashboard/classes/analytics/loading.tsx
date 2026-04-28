export default function TeacherClassAnalyticsLoading() {
  return (
    <div className="staff-dash-bento staff-dash-bento--stack animate-pulse">
      <div className="staff-dash-bento-main space-y-4">
        <div className="flex flex-wrap gap-2">
          <span className="h-8 w-24 rounded-full bg-[color:var(--anx-surface-container-high)]" />
          <span className="h-8 w-24 rounded-full bg-[color:var(--anx-surface-container-high)]" />
          <span className="h-8 w-24 rounded-full bg-[color:var(--anx-surface-container-high)]" />
        </div>
        {[0, 1].map((i) => (
          <div key={i} className="staff-dash-class-panel overflow-hidden">
            <div className="staff-dash-class-head space-y-2">
              <div className="h-5 w-48 rounded bg-[color:var(--anx-surface-container-high)]" />
              <div className="h-3 w-72 max-w-full rounded bg-[color:var(--anx-surface-container-high)]" />
            </div>
            <div className="staff-dash-metric-grid">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="staff-dash-metric-tile">
                  <div className="mb-2 h-3 w-16 rounded bg-[color:var(--anx-surface-container-high)]" />
                  <div className="h-6 w-12 rounded bg-[color:var(--anx-surface-container-high)]" />
                </div>
              ))}
            </div>
            <div className="staff-dash-disclosure-bar">
              <span className="h-4 w-48 rounded bg-[color:var(--anx-surface-container-high)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

(() => {
  const sdk = window.__HERMES_PLUGIN_SDK__;
  const { React, fetchJSON } = sdk;
  const { useEffect, useMemo, useState } = sdk.hooks;
  const e = React.createElement;
  const MessageCircle = null;

  const styles = `
.git-comments-page{padding:0 24px 32px;color:#f0f6fc}
.git-comments-health,.git-comments-panel{border:1px solid #334155;background:#0c1624;margin-top:20px}
.git-comments-health{padding:22px 28px;display:block;text-align:left}
.git-comments-health-copy{display:block}.git-comments-health-title{display:flex;align-items:center;justify-content:space-between;gap:14px}.git-comments-health-dot{width:15px;height:15px;flex:0 0 15px;border-radius:50%;background:#64748b;box-shadow:0 0 0 4px rgba(100,116,139,.15)}.git-comments-health-dot.healthy{background:#4ade80;box-shadow:0 0 0 4px rgba(74,222,128,.17),0 0 14px rgba(74,222,128,.48)}.git-comments-summary{margin-top:10px}
.git-comments-kicker{font-size:18px;letter-spacing:.16em;text-transform:uppercase;color:#f0f6fc}.git-comments-muted{color:#9ca9bd}
.git-comments-summary{font-size:16px;letter-spacing:.08em;color:#f0f6fc}.git-comments-panel-title{padding:22px 28px;border-bottom:1px solid #334155;font-size:22px;font-weight:750;color:#f0f6fc}
.git-comments-issue{margin:18px 28px;border:1px solid #334155;border-radius:16px;overflow:hidden;background:#101b30;color:#f0f6fc}
.git-comments-issue.received{border-color:#4ade80;box-shadow:0 0 0 2px rgba(74,222,128,.24)}
.git-comments-issue-head{display:flex;align-items:center;gap:12px;padding:15px 18px;border-bottom:1px solid #334155;color:#f0f6fc}
.git-comments-number{font-size:20px;font-weight:800;color:#f0f6fc}.git-comments-link{color:#5db3ff;text-decoration:none}.git-comments-status{margin-left:auto;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#9ca9bd}
.git-comments-status.received{color:#4ade80;font-weight:800}.git-comments-comments{display:grid;gap:12px;padding:14px}
.git-comments-comment-label{display:inline-flex;align-items:center;padding:5px 10px;border:1px solid #4ade80;border-radius:999px;background:#14532d;color:#dcfce7;font-size:12px;font-weight:850;letter-spacing:.08em;text-decoration:none}.git-comments-comment-label:hover{background:#166534;color:#fff}
.git-comments-comment{padding:16px;border:1px solid rgba(255,255,255,.09);border-radius:13px;background:#17213b;color:#f0f6fc}
.git-comments-comment.maintainer{border-color:rgba(74,222,128,.55)}.git-comments-author{display:flex;gap:10px;align-items:center;font-weight:750;color:#f0f6fc}
.git-comments-avatar{width:32px;height:32px;border-radius:50%}.git-comments-time{font-weight:400;color:#9ca9bd;font-size:13px}.git-comments-association{margin-left:auto;padding:3px 9px;border:1px solid #64748b;border-radius:999px;color:#cbd5e1;font-size:11px;font-weight:750;letter-spacing:.04em}
.git-comments-body{white-space:pre-wrap;overflow-wrap:anywhere;margin-top:12px;color:#c4cce0;line-height:1.55}.git-comments-empty{padding:18px;color:#9ca9bd}
.git-comments-events{display:grid;gap:10px;padding:4px 14px 16px}.git-comments-event{display:flex;align-items:center;gap:10px;padding:10px 12px;border-left:3px solid #64748b;background:#0c1624;color:#c4cce0}.git-comments-event-avatar{width:24px;height:24px;border-radius:50%}.git-comments-event strong{color:#f0f6fc}.git-comments-event-label{padding:2px 8px;border:1px solid currentColor;border-radius:999px;font-size:12px;font-weight:800}
`;

  function fmt(value) {
    if (!value) return "Never";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
  }

  function authorName(comment) {
    return comment.author?.login || comment.user?.login || comment.user || comment.author || "unknown";
  }

  function avatar(comment) {
    return comment.author?.avatar_url || comment.user?.avatar_url || comment.avatar_url || "";
  }

  function associationLabel(comment) {
    const value = String(comment.author_association || "").replaceAll("_", " ").trim();
    if (!value || value === "NONE") return "";
    return value.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function eventActor(item) {
    return item.actor?.login || "unknown";
  }

  function eventText(item) {
    if (item.event === "closed") return `closed this as ${String(item.state_reason || "completed").replaceAll("_", " ")}`;
    if (item.event === "reopened") return "reopened this";
    if (item.event === "labeled") return "added";
    if (item.event === "unlabeled") return "removed";
    return item.event || "updated this";
  }

  function labelColor(item) {
    const value = item.label?.color || "64748b";
    return /^[0-9a-f]{6}$/i.test(value) ? `#${value}` : "#64748b";
  }

  function Issue({ issue, owner }) {
    const comments = Array.isArray(issue.comments) ? issue.comments : [];
    const statusEvents = Array.isArray(issue.status_events) ? issue.status_events : [];
    const received = comments.filter((comment) => authorName(comment).toLowerCase() !== owner.toLowerCase());
    const hasReceived = received.length > 0 || Number(issue.new_received_count || 0) > 0;
    const number = issue.number || issue.issue_number;
    const url = issue.html_url || issue.issue_url || `https://github.com/NousResearch/hermes-agent/issues/${number}`;
    const sourceComment = received[received.length - 1];
    const sourceCommentUrl = sourceComment?.html_url || sourceComment?.url || null;
    return e("section", { className: `git-comments-issue${hasReceived ? " received" : ""}` },
      e("div", { className: "git-comments-issue-head" },
        MessageCircle ? e(MessageCircle, { size: 18 }) : "💬",
        e("span", { className: "git-comments-number" }, `#${number}`),
        sourceCommentUrl ? null : e("a", { className: "git-comments-link", href: url, target: "_blank", rel: "noreferrer" }, "View on GitHub →"),
        sourceCommentUrl ? e("a", { className: "git-comments-comment-label", href: sourceCommentUrl, target: "_blank", rel: "noreferrer", "aria-label": `Open ${received.length} received comments on GitHub` }, `COMMENTS (${received.length})`) : null,
        e("span", { className: `git-comments-status${hasReceived ? " received" : ""}` }, hasReceived ? `${received.length} received` : "watching")
      ),
      comments.length ? e("div", { className: "git-comments-comments" }, comments.map((comment) => {
        const fromMaintainer = authorName(comment).toLowerCase() !== owner.toLowerCase();
        const association = associationLabel(comment);
        return e("article", { key: comment.id || `${authorName(comment)}-${comment.created_at}`, className: `git-comments-comment${fromMaintainer ? " maintainer" : ""}` },
          e("div", { className: "git-comments-author" },
            avatar(comment) ? e("img", { className: "git-comments-avatar", src: avatar(comment), alt: "" }) : null,
            e("span", null, authorName(comment)),
            e("span", { className: "git-comments-time" }, fmt(comment.created_at)),
            association ? e("span", { className: "git-comments-association" }, association) : null
          ),
          e("div", { className: "git-comments-body" }, comment.body || "")
        );
      })) : e("div", { className: "git-comments-empty" }, "No comments yet."),
      statusEvents.length ? e("div", { className: "git-comments-events", "aria-label": "GitHub status timeline" }, statusEvents.map((item) =>
        e("div", { key: item.id || `${item.event}-${item.created_at}`, className: "git-comments-event" },
          item.actor?.avatar_url ? e("img", { className: "git-comments-event-avatar", src: item.actor.avatar_url, alt: "" }) : null,
          e("span", null, e("strong", null, eventActor(item)), ` ${eventText(item)}`),
          item.label?.name ? e("span", { className: "git-comments-event-label", style: { color: labelColor(item), borderColor: labelColor(item) } }, item.label.name) : null,
          e("span", { className: "git-comments-time" }, fmt(item.created_at))
        )
      )) : null
    );
  }

  function GitCommentsPage() {
    const [state, setState] = useState({ loading: true, data: null, error: null });
    useEffect(() => {
      let alive = true;
      fetchJSON("/api/plugins/git-comments/data").then((data) => alive && setState({ loading: false, data, error: null })).catch((error) => alive && setState({ loading: false, data: null, error: String(error) }));
      return () => { alive = false; };
    }, []);
    const data = state.data || {};
    const issues = Array.isArray(data.issues) ? data.issues : [];
    const owner = data.owner || "AgentAi-Leo";
    const health = data.watcher_health || {};
    const watcherHealthy = health.ok === true && health.stale !== true;
    const commented = useMemo(() => issues.filter((issue) => (issue.comments || []).some((comment) => authorName(comment).toLowerCase() !== owner.toLowerCase())).length, [issues, owner]);
    if (state.loading) return e("div", { className: "git-comments-page" }, "Loading Git Comments…");
    if (state.error) return e("div", { className: "git-comments-page" }, `Git Comments failed: ${state.error}`);
    return e(React.Fragment, null,
      e("style", null, styles),
      e("div", { className: "git-comments-page" },
        e("section", { className: "git-comments-health" },
          e("div", { className: "git-comments-health-copy" },
            e("div", { className: "git-comments-health-title" },
              e("div", { className: "git-comments-kicker" }, watcherHealthy ? "Watcher healthy" : "Watcher needs attention"),
              e("span", { className: `git-comments-health-dot${watcherHealthy ? " healthy" : ""}`, role: "img", "aria-label": watcherHealthy ? "Watcher status healthy" : `Watcher status ${health.status || "unknown"}`, title: watcherHealthy ? "Watcher status healthy" : health.error || `Watcher status ${health.status || "unknown"}` })
            ),
            e("div", { className: "git-comments-muted" }, `Last successful check: ${fmt(health.checked_at || data.checked_at || data.updated)}`),
            e("div", { className: "git-comments-summary" }, `WATCHING (${issues.length}) · COMMENTED (${commented})`)
          )
        ),
        e("section", { className: "git-comments-panel" },
          e("div", { className: "git-comments-panel-title" }, "💼 GITHUB ISSUES"),
          issues.map((issue) => e(Issue, { key: issue.number || issue.issue_number, issue, owner }))
        )
      )
    );
  }

  window.__HERMES_PLUGINS__.register("git-comments", GitCommentsPage);
})();

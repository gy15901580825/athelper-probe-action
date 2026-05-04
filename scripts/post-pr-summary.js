// scripts/post-pr-summary.js
//
// Parses SARIF and posts PR check summary + annotations via GitHub Checks API.
// Exported as a function compatible with actions/github-script@v7.
//
// The action.yml inlines this script via:
//   const summarize = require(path.join(github.action_path, 'scripts', 'post-pr-summary.js'));
//   await summarize({ github, context, core });

const fs = require('fs');

module.exports = async function ({ github, context, core }) {
  let sarif;
  try {
    sarif = JSON.parse(fs.readFileSync('report.sarif', 'utf8'));
  } catch (e) {
    core.warning(`Could not parse report.sarif: ${e.message}`);
    return;
  }

  const findings = (sarif.runs || []).flatMap(r => r.results || []);

  const bySeverity = { critical: [], high: [], medium: [], low: [], info: [] };
  for (const f of findings) {
    const sev = (f.properties && f.properties.severity) || 'info';
    (bySeverity[sev] || bySeverity.info).push(f);
  }

  const summary =
    `## ATHelper findings\n\n` +
    `| Severity | Count |\n|---|---|\n` +
    `| Critical | ${bySeverity.critical.length} |\n` +
    `| High     | ${bySeverity.high.length} |\n` +
    `| Medium   | ${bySeverity.medium.length} |\n` +
    `| Low      | ${bySeverity.low.length} |\n` +
    `| Info     | ${bySeverity.info.length} |\n` +
    `\nTotal: ${findings.length} findings.`;

  // GitHub Checks API limits annotations to 50 per check.
  const annotations = findings.slice(0, 50).map(f => {
    const message =
      (f.message && f.message.text) ||
      (f.ruleId ? `Rule: ${f.ruleId}` : 'ATHelper finding');
    const sev = (f.properties && f.properties.severity) || 'info';
    return {
      path: '.athelper',  // pseudo-path — ATHelper findings have no source-code line
      start_line: 1,
      end_line: 1,
      annotation_level: sev === 'critical' || sev === 'high' ? 'failure' : 'warning',
      // GitHub limits annotation message to 4000 chars and title to 255
      message: message.slice(0, 4000),
      title: `[${sev.toUpperCase()}] ${f.ruleId || 'ATHelper'}`.slice(0, 255),
    };
  });

  // Post a check run only on PRs (not pushes to main)
  if (context.payload.pull_request) {
    try {
      await github.rest.checks.create({
        owner: context.repo.owner,
        repo: context.repo.repo,
        name: 'ATHelper findings',
        head_sha: context.payload.pull_request.head.sha,
        status: 'completed',
        conclusion: 'neutral',  // never blocks; threshold-gate.sh handles PR fail
        output: {
          title: `${findings.length} findings`,
          summary,
          annotations,
        },
      });
    } catch (e) {
      core.warning(`checks.create failed: ${e.message}`);
    }
  }

  // Always also write to the step summary (visible in workflow run logs even for non-PR triggers)
  await core.summary.addRaw(summary).write();
};

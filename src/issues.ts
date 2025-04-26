import { formatDistanceToNow } from 'date-fns'
import { Octokit } from 'octokit'

type Issue = {
  url: string
  repository_url: string
  labels_url: string
  comments_url: string
  events_url: string
  html_url: string
  id: number
  node_id: string
  number: number
  title: string
  locked: boolean
  created_at: string
  updated_at: string
  closed_at: string | null
  state: string
}

export async function GetIssues(
  octokit: Octokit,
  query: string
): Promise<Issue[]> {
  // https://github.com/octokit/plugin-rest-endpoint-methods.js/blob/main/docs/search/issuesAndPullRequests.md
  // https://docs.github.com/en/search-github/searching-on-github/searching-issues-and-pull-requests

  const issues = []
  for await (const response of octokit.paginate.iterator(
    octokit.rest.search.issuesAndPullRequests,
    {
      q: query,
      per_page: 100,
      advanced_search: 'true'
    }
  )) {
    issues.push(...response.data)
  }
  return issues
}

export function IssuesToMarkdown(issues: Issue[]): string {
  let markdown = ''
  for (const issue of issues) {
    markdown += `* ${issue.html_url} `
    if (issue.closed_at) {
      markdown += `(closed ${formatDistanceToNow(new Date(issue.closed_at), { addSuffix: true })})`
    } else if (issue.updated_at > issue.created_at) {
      markdown += `(updated ${formatDistanceToNow(new Date(issue.updated_at), { addSuffix: true })})`
    } else {
      markdown += `(created ${formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })})`
    }
    markdown += '\n'
  }
  return markdown
}

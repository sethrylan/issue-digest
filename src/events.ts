import { MyOctokit } from './octokit-types.js'
import { Issue } from './issues.js'
import * as core from '@actions/core'

// a subset of the Timeline event object, to avoid too much context
export type TimelineEvent = {
  url: string
  html_url: string
  issue_url: string
  id: number
  node_id: string
  user: {
    login: string | null
    id: number
  }
  actor: {
    login: string | null
    id: number
  }
  created_at: string
  updated_at: string | null
  author_association: string
  body: string
  event: string
}

/**
 * Retrieves timeline events for a specific GitHub issue
 *
 * @param octokit - The Octokit instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param issueNumber - Issue number
 * @param startDate - Date to filter events (only events after this date will be included)
 * @returns Promise resolving to an array of timeline events
 */
export async function GetTimelineForIssue(
  octokit: MyOctokit,
  issue: Issue,
  startDate: Date
): Promise<TimelineEvent[]> {
  const path = new URL(issue.html_url).pathname.split('/')
  const owner = path[1]
  const repo = path[2]

  console.log(
    `Fetching timeline for issue: ${issue.html_url}, owner: ${owner}, repo: ${repo}, issue number: ${issue.number}`
  )

  // see https://docs.github.com/en/rest/issues/timeline
  const timelineEvents: TimelineEvent[] = []
  for await (const response of octokit.paginate.iterator(
    octokit.rest.issues.listEventsForTimeline,
    {
      owner: owner,
      repo: repo,
      issue_number: issue.number
    }
  )) {
    response.data.map((event) => {
      timelineEvents.push(event as unknown as TimelineEvent)
      // Filter for only timeline events that are updated or created after the start date
      core.debug(`Event: ${JSON.stringify(event)}`)
      core.debug(`Start date: ${startDate.toISOString()}`)
      if ('updated_at' in event && new Date(event.updated_at) > startDate) {
        timelineEvents.push(event as unknown as TimelineEvent)
        core.debug(`adding event because updated_at is after start date`)
      } else if (
        'created_at' in event &&
        new Date(event.created_at) > startDate
      ) {
        timelineEvents.push(event as unknown as TimelineEvent)
        core.debug(`adding event because updated_at is after start date`)
      }
    })
  }
  return timelineEvents
}

import * as core from '@actions/core'
import { Octokit } from 'octokit'
import { paginateGraphQL } from '@octokit/plugin-paginate-graphql'
import { withDefault, yesterday } from './util.js'
import { formatDistanceToNow } from 'date-fns'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const repository: string = withDefault(
      core.getInput('repo'),
      process.env.GITHUB_REPOSITORY!
    )

    const owner = repository.split('/')[0]
    const repo = repository.split('/')[1]

    const query: string = withDefault(
      core.getInput('query'),
      `owner:${owner} repo:${repo} updated:>=${yesterday()}`
    )
    const title: string = withDefault(
      core.getInput('title'),
      `Issue Digest for ${new Date().toISOString().split('T')[0]}`
    )
    const intro: string = withDefault(
      core.getInput('intro'),
      `Hello there! This discussion is a digest of issues that will be updated.`
    )
    const comment: string = withDefault(core.getInput('comment'), '')
    const discussionCategory: string = withDefault(
      core.getInput('discussionCategory'),
      'General'
    )

    const workflowRunUrl: string = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    const footer: string = `<hr /><em>This discussion was prompted <a href='https://github.com/search?q=${query}'>by a search query</a> in a <a href='${workflowRunUrl}'>workflow run</a> using <a href='https://github.com/sethrylan/issue-digest'>issue-digest</a>.</em>`

    const MyOctokit = Octokit.plugin(paginateGraphQL)
    const octokit = new MyOctokit({ auth: process.env.GITHUB_TOKEN })

    console.log(`Using query: ${query}`)

    const issues = await getIssues(octokit, query)

    console.log(`${issues.length} issues found.`)

    if (issues.length === 0) {
      return
    }

    const categories = await getDiscussionCategories(octokit, owner, repo)
    const category = categories!.find(
      (category) => category!.name === discussionCategory
    )
    console.log(`Discussion category: ${JSON.stringify(category)}`)
    if (!category) {
      core.setFailed(`Discussion category (${discussionCategory}) not found`)
      return
    }

    const repoId = await findRepoId(octokit, owner, repo)
    let foundDiscussion = await findDiscussion(
      octokit,
      owner,
      repo,
      title,
      category.id
    )

    if (!foundDiscussion) {
      console.log('Discussion not found.')
      // Create a new discussion
      // https://docs.github.com/en/graphql/guides/using-the-graphql-api-for-discussions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resp = await octokit.graphql<any>(
        `mutation createDiscussion($input: CreateDiscussionInput!) {
          createDiscussion(input: $input) {
            discussion {
              title
              url
              id
            }
          }
        }`,
        {
          input: {
            repositoryId: repoId,
            title: title,
            body: intro + footer,
            categoryId: category.id
          }
        }
      )

      foundDiscussion = resp.createDiscussion.discussion
      console.log(`Discussion created: ${foundDiscussion.url}`)
    }

    console.log(`Discussion found: ${foundDiscussion.url}`)

    // Add a comment to the discussion
    const resp = await octokit.graphql(
      `mutation addComment($discussionID: ID!, $body: String!) {
        addDiscussionComment(input: {discussionId: $discussionID, body: $body}) {
          clientMutationId
          comment {
            url
          }
        }
      }`,
      {
        discussionID: foundDiscussion.id,
        body: `${comment}${comment ? '\n' : ''} ${issuesToMarkdown(issues)}`
      }
    )
    console.log('Discussion updated.')
    console.log(resp)

    core.setOutput('discussionUrl', foundDiscussion.url)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

async function getDiscussionCategories(
  octokit: Octokit,
  owner: string,
  repo: string
) {
  console.log(`Finding discussion categories in ${owner}/${repo}`)
  const response = await octokit.graphql<RepoDiscussionCategories>(
    `query {
      repository(owner: "${owner}", name: "${repo}") {
        discussionCategories(first: 50) {
          nodes {
            id
            name
          }
        }
      }
    }`
  )

  return response!.repository!.discussionCategories!.nodes
}

type Nodes = {
  nodes:
    | ({
        id: string
        name: string
      } | null)[]
    | null
}

type RepoDiscussionCategories = {
  repository: {
    discussionCategories: Nodes | null
  } | null
}

async function findRepoId(octokit: Octokit, owner: string, repo: string) {
  console.log(`Finding repo id for ${owner}/${repo}`)
  const response = await octokit.graphql<{ repository: { id: string } }>(
    `query {
      repository(owner: "${owner}", name: "${repo}") {
        id
        name
      }
    }`
  )

  return response!.repository!.id
}

async function findDiscussion(
  octokit: Octokit,
  owner: string,
  repo: string,
  title: string,
  categoryId: string
) {
  console.log(`Finding discussion with title: ${title} in ${owner}/${repo}`)

  // https://docs.github.com/en/graphql/guides/using-the-graphql-api-for-discussions
  const discussionIter = octokit.graphql.paginate.iterator(
    `query paginate($cursor: String) {
      repository(owner: "${owner}", name: "${repo}") {
        discussions(first: 10, after: $cursor) {
          nodes {
            id
            title
            url
            category {
              id
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }`
  )

  for await (const page of discussionIter) {
    const discussions = page.repository.discussions.nodes
    core.debug(discussions)
    if (!discussions || discussions.length === 0) {
      core.debug('page: empty')
      return undefined
    }
    console.log(`discussion page length: ${discussions.length}`)

    for (const d of discussions) {
      if (d.title == title && d.category.id == categoryId) {
        return d
      }
    }
  }
}

async function getIssues(octokit: Octokit, query: string) {
  // https://github.com/octokit/plugin-rest-endpoint-methods.js/blob/main/docs/search/issuesAndPullRequests.md
  // https://docs.github.com/en/search-github/searching-on-github/searching-issues-and-pull-requests

  const issues = []
  for await (const response of octokit.paginate.iterator(
    octokit.rest.search.issuesAndPullRequests,
    {
      q: query,
      per_page: 100
    }
  )) {
    issues.push(...response.data)
  }
  return issues
}

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

function issuesToMarkdown(issues: Issue[]): string {
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

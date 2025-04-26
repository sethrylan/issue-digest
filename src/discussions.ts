import { Octokit } from 'octokit'
import * as core from '@actions/core'

export async function FindDiscussion(
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

export async function GetDiscussionCategories(
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

// Create a new discussion
// https://docs.github.com/en/graphql/guides/using-the-graphql-api-for-discussions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function CreateDiscussion(
  octokit: Octokit,
  repoId: string,
  categoryId: string,
  title: string,
  body: string
) {
  return await octokit.graphql<any>(
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
        body: body,
        categoryId: categoryId
      }
    }
  )
}

export async function AddComment(
  octokit: Octokit,
  discussionIdToComment: string,
  body: string
) {
  return await octokit.graphql(
    `mutation addComment($discussionID: ID!, $body: String!) {
      addDiscussionComment(input: {discussionId: $discussionID, body: $body}) {
        clientMutationId
        comment {
          url
        }
      }
    }`,
    {
      discussionID: discussionIdToComment,
      body: body
    }
  )
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

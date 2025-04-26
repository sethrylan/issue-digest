import * as core from '@actions/core'
import { Octokit } from 'octokit'
import { paginateGraphQL } from '@octokit/plugin-paginate-graphql'
import { withDefault, yesterday } from './util.js'
import {
  AddComment,
  CreateDiscussion,
  FindDiscussion,
  GetDiscussionCategories
} from './discussions.js'
import { GetIssues, IssuesToMarkdown } from './issues.js'

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
    const query: string = withDefault(
      core.getInput('query'),
      `repo:${repository} updated:>=${yesterday()}`
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

    const issues = await GetIssues(octokit, query)

    console.log(`${issues.length} issues found.`)

    if (issues.length === 0) {
      return
    }

    const owner = repository.split('/')[0]
    const repo = repository.split('/')[1]

    const categories = await GetDiscussionCategories(octokit, owner, repo)
    const category = categories!.find(
      (category) => category!.name === discussionCategory
    )
    console.log(`Discussion category: ${JSON.stringify(category)}`)
    if (!category) {
      core.setFailed(`Discussion category (${discussionCategory}) not found`)
      return
    }

    const repoId = await findRepoId(octokit, owner, repo)
    let foundDiscussion = await FindDiscussion(
      octokit,
      owner,
      repo,
      title,
      category.id
    )

    if (!foundDiscussion) {
      console.log('Discussion not found.')
      const resp = await CreateDiscussion(
        octokit,
        repoId,
        category.id,
        title,
        intro + footer
      )

      foundDiscussion = resp.createDiscussion.discussion
      console.log(`Discussion created: ${foundDiscussion.url}`)
    }

    console.log(`Discussion found: ${foundDiscussion.url}`)

    // Add a comment to the discussion
    const resp = await AddComment(
      octokit,
      foundDiscussion.id,
      `${comment}${comment ? '\n' : ''} ${IssuesToMarkdown(issues)}`
    )
    console.log('Discussion updated.')
    console.log(resp)

    core.setOutput('discussionUrl', foundDiscussion.url)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
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

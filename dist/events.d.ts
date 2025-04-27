import { Octokit } from 'octokit';
import { Issue } from './issues.js';
export type TimelineEvent = {
    url: string;
    html_url: string;
    issue_url: string;
    id: number;
    node_id: string;
    user: {
        login: string | null;
        id: number;
    };
    actor: {
        login: string | null;
        id: number;
    };
    created_at: string;
    updated_at: string | null;
    author_association: string;
    body: string;
    event: string;
};
/**
 * Retrieves timeline events for a specific GitHub issue
 *
 * @param octokit - The Octokit instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param issueNumber - Issue number
 * @returns Promise resolving to an array of timeline events
 */
export declare function GetTimelineForIssue(octokit: Octokit, issue: Issue): Promise<TimelineEvent[]>;

import { Octokit } from 'octokit';
export declare function FindDiscussion(octokit: Octokit, owner: string, repo: string, title: string, categoryId: string): Promise<any>;
export declare function GetDiscussionCategories(octokit: Octokit, owner: string, repo: string): Promise<({
    id: string;
    name: string;
} | null)[] | null>;
export declare function CreateDiscussion(octokit: Octokit, repoId: string, categoryId: string, title: string, body: string): Promise<any>;
export declare function AddComment(octokit: Octokit, discussionIdToComment: string, body: string): Promise<unknown>;

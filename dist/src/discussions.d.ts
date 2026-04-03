import { MyOctokit } from './octokit-types.js';
export declare function FindDiscussion(octokit: MyOctokit, owner: string, repo: string, title: string, categoryId: string): Promise<any>;
export declare function GetDiscussionCategories(octokit: MyOctokit, owner: string, repo: string): Promise<({
    id: string;
    name: string;
} | null)[] | null>;
export declare function CreateDiscussion(octokit: MyOctokit, repoId: string, categoryId: string, title: string, body: string): Promise<any>;
export declare function AddComment(octokit: MyOctokit, discussionIdToComment: string, body: string): Promise<unknown>;

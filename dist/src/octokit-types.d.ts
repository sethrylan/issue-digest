import { Octokit } from '@octokit/core';
import { paginateGraphQL } from '@octokit/plugin-paginate-graphql';
import { paginateRest } from '@octokit/plugin-paginate-rest';
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods';
export type MyOctokit = Octokit & ReturnType<typeof paginateGraphQL> & ReturnType<typeof paginateRest> & ReturnType<typeof restEndpointMethods>;

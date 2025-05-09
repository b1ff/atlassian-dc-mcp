/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExampleAvatarMultipartFormData } from '../models/ExampleAvatarMultipartFormData.js';
import type { ExampleSettings } from '../models/ExampleSettings.js';
import type { RestApplicationUser } from '../models/RestApplicationUser.js';
import type { RestAutoDeclineSettings } from '../models/RestAutoDeclineSettings.js';
import type { RestAutoDeclineSettingsRequest } from '../models/RestAutoDeclineSettingsRequest.js';
import type { RestAutoMergeProjectSettingsRequest } from '../models/RestAutoMergeProjectSettingsRequest.js';
import type { RestAutoMergeRestrictedSettings } from '../models/RestAutoMergeRestrictedSettings.js';
import type { RestBranch } from '../models/RestBranch.js';
import type { RestDefaultTask } from '../models/RestDefaultTask.js';
import type { RestDefaultTaskRequest } from '../models/RestDefaultTaskRequest.js';
import type { RestDetailedGroup } from '../models/RestDetailedGroup.js';
import type { RestDetailedInvocation } from '../models/RestDetailedInvocation.js';
import type { RestHookScriptConfig } from '../models/RestHookScriptConfig.js';
import type { RestHookScriptTriggers } from '../models/RestHookScriptTriggers.js';
import type { RestInvocationHistory } from '../models/RestInvocationHistory.js';
import type { RestMinimalRef } from '../models/RestMinimalRef.js';
import type { RestPermitted } from '../models/RestPermitted.js';
import type { RestPermittedGroup } from '../models/RestPermittedGroup.js';
import type { RestPermittedUser } from '../models/RestPermittedUser.js';
import type { RestProject } from '../models/RestProject.js';
import type { RestProjectSettingsRestriction } from '../models/RestProjectSettingsRestriction.js';
import type { RestProjectSettingsRestrictionRequest } from '../models/RestProjectSettingsRestrictionRequest.js';
import type { RestPullRequestSettings } from '../models/RestPullRequestSettings.js';
import type { RestRefRestriction } from '../models/RestRefRestriction.js';
import type { RestRepository } from '../models/RestRepository.js';
import type { RestRepositoryHook } from '../models/RestRepositoryHook.js';
import type { RestRestrictionRequest } from '../models/RestRestrictionRequest.js';
import type { RestWebhook } from '../models/RestWebhook.js';
import type { RestWebhookCredentials } from '../models/RestWebhookCredentials.js';
import type { RestWebhookRequestResponse } from '../models/RestWebhookRequestResponse.js';
import type { CancelablePromise } from '../core/CancelablePromise.js';
import { OpenAPI } from '../core/OpenAPI.js';
import { request as __request } from '../core/request.js';
export class ProjectService {
  /**
   * Deletes all default tasks for the project
   * Delete all the default tasks for the supplied project
   *
   * The authenticated user must have **PROJECT_ADMIN** permission for this project to call the resource.
   * @param projectKey The project key.
   * @returns void
   * @throws ApiError
   */
  public static deleteAllDefaultTasks(
    projectKey: string,
  ): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/default-tasks/latest/projects/{projectKey}/tasks',
      path: {
        'projectKey': projectKey,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to delete default tasks`,
        404: `The specified project does not exist`,
      },
    });
  }
  /**
   * Get a page of default tasks
   * Retrieves the default tasks for the supplied project.
   *
   * The authenticated user must have **PROJECT_VIEW** permission for this project to call the resource.
   * @param projectKey The project key.
   * @param markup If present or "true", includes a markup-rendered description
   * @param start Start number for the page (inclusive). If not passed, first page is assumed.
   * @param limit Number of items to return. If not passed, a page size of 25 is used.
   * @returns any A page of default tasks
   * @throws ApiError
   */
  public static getDefaultTasks(
    projectKey: string,
    markup?: string,
    start?: number,
    limit?: number,
  ): CancelablePromise<{
    isLastPage?: boolean;
    limit?: number;
    nextPageStart?: number;
    size?: number;
    start?: number;
    values?: Array<RestDefaultTask>;
  }> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/default-tasks/latest/projects/{projectKey}/tasks',
      path: {
        'projectKey': projectKey,
      },
      query: {
        'markup': markup,
        'start': start,
        'limit': limit,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to delete default tasks`,
        404: `The specified project does not exist`,
      },
    });
  }
  /**
   * Add a default task
   * Creates a default task for the project.
   *
   * The authenticated user must have **PROJECT_ADMIN** permission for this project to call the resource.
   * @param projectKey The project key.
   * @param requestBody The task to be added
   * @returns RestDefaultTask The default task
   * @throws ApiError
   */
  public static addDefaultTask(
    projectKey: string,
    requestBody: RestDefaultTaskRequest,
  ): CancelablePromise<RestDefaultTask> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/default-tasks/latest/projects/{projectKey}/tasks',
      path: {
        'projectKey': projectKey,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `One or more of the following error cases occurred (check the error message for more details):
                - the description is empty- the sourceMatcher or targetMatcher is invalid`,
        401: `The currently authenticated user has insufficient permissions to add a default task`,
        404: `The specified project does not exist`,
      },
    });
  }
  /**
   * Delete a specific default task
   * Delete a specific default task for a project.
   *
   * The authenticated user must have **PROJECT_ADMIN** permission for this project to call the resource.
   * @param projectKey The project key.
   * @param taskId The ID of the default task
   * @returns void
   * @throws ApiError
   */
  public static deleteDefaultTask(
    projectKey: string,
    taskId: string,
  ): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/default-tasks/latest/projects/{projectKey}/tasks/{taskId}',
      path: {
        'projectKey': projectKey,
        'taskId': taskId,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to delete default tasks`,
        404: `The specified project or task does not exist`,
      },
    });
  }
  /**
   * Update a default task
   * Updates a default task for the supplied project.
   *
   * The authenticated user must have **PROJECT_ADMIN** permission for this project to call the resource.
   * @param projectKey The project key.
   * @param taskId The ID of the default task
   * @param requestBody The task to be updated
   * @returns RestDefaultTask The default task
   * @throws ApiError
   */
  public static updateDefaultTask(
    projectKey: string,
    taskId: string,
    requestBody: RestDefaultTaskRequest,
  ): CancelablePromise<RestDefaultTask> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/default-tasks/latest/projects/{projectKey}/tasks/{taskId}',
      path: {
        'projectKey': projectKey,
        'taskId': taskId,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `One or more of the following error cases occurred (check the error message for more details):
                - the provided taskId does not exist- the description is empty- the sourceMatcher or targetMatcher is invalid`,
        401: `The currently authenticated user has insufficient permissions to add a default task`,
        404: `The specified project does not exist`,
      },
    });
  }
  /**
   * Search for ref restrictions
   * Search for restrictions using the supplied parameters.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission or higher to call this resource. Only authenticated users may call this resource.
   * @param projectKey The project key.
   * @param matcherType Matcher type to filter on
   * @param matcherId Matcher id to filter on. Requires the matcherType parameter to be specified also.
   * @param type Types of restrictions to filter on.
   * @param start Start number for the page (inclusive). If not passed, first page is assumed.
   * @param limit Number of items to return. If not passed, a page size of 25 is used.
   * @returns any A response containing a page of restrictions.
   * @throws ApiError
   */
  public static getRestrictions(
    projectKey: string,
    matcherType?: 'BRANCH' | 'PATTERN' | 'MODEL_CATEGORY' | 'MODEL_BRANCH',
    matcherId?: string,
    type?: 'read-only' | 'no-deletes' | 'fast-forward-only' | 'pull-request-only' | 'no-creates',
    start?: number,
    limit?: number,
  ): CancelablePromise<{
    isLastPage?: boolean;
    limit?: number;
    nextPageStart?: number;
    size?: number;
    start?: number;
    values?: Array<RestRefRestriction>;
  }> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/branch-permissions/latest/projects/{projectKey}/restrictions',
      path: {
        'projectKey': projectKey,
      },
      query: {
        'matcherType': matcherType,
        'matcherId': matcherId,
        'type': type,
        'start': start,
        'limit': limit,
      },
      errors: {
        400: `The request has failed validation.`,
        401: `The currently authenticated user is not permitted to get restrictions on the provided project`,
        404: `No restriction exists for the provided ID.`,
      },
    });
  }
  /**
   * Create multiple ref restrictions
   * Allows creating multiple restrictions at once.
   * @param projectKey The project key.
   * @param requestBody The request containing a list of the details of the restrictions to create.
   * @returns RestRefRestriction Response contains the ref restriction that was just created.
   * @throws ApiError
   */
  public static createRestrictions(
    projectKey: string,
    requestBody?: Array<RestRestrictionRequest>,
  ): CancelablePromise<RestRefRestriction> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/branch-permissions/latest/projects/{projectKey}/restrictions',
      path: {
        'projectKey': projectKey,
      },
      body: requestBody,
      mediaType: 'application/vnd.atl.bitbucket.bulk+json',
      errors: {
        400: `The request has failed validation.`,
        401: `The currently authenticated user has insufficient permissions to perform this operation.`,
      },
    });
  }
  /**
   * Delete a ref restriction
   * Deletes a restriction as specified by a restriction id.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission or higher to call this resource. Only authenticated users may call this resource.
   * @param projectKey The project key.
   * @param id The restriction id.
   * @returns void
   * @throws ApiError
   */
  public static deleteRestriction(
    projectKey: string,
    id: string,
  ): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/branch-permissions/latest/projects/{projectKey}/restrictions/{id}',
      path: {
        'projectKey': projectKey,
        'id': id,
      },
      errors: {
        400: `The request has failed validation.`,
        401: `The currently authenticated user is not permitted to delete restrictions on the provided project`,
      },
    });
  }
  /**
   * Get a ref restriction
   * Returns a restriction as specified by a restriction id.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission or higher to call this resource. Only authenticated users may call this resource.
   * @param projectKey The project key.
   * @param id The restriction id.
   * @returns RestRefRestriction A response containing the restriction.
   * @throws ApiError
   */
  public static getRestriction(
    projectKey: string,
    id: string,
  ): CancelablePromise<RestRefRestriction> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/branch-permissions/latest/projects/{projectKey}/restrictions/{id}',
      path: {
        'projectKey': projectKey,
        'id': id,
      },
      errors: {
        400: `The request has failed validation.`,
        401: `The currently authenticated user is not permitted to get restrictions on the provided project`,
        404: `No restriction exists for the provided ID.`,
      },
    });
  }
  /**
   * Get project avatar
   * Retrieve the avatar for the project matching the supplied <strong>moduleKey</strong>.
   * @param hookKey The complete module key of the hook module.
   * @param version (optional) Version used for HTTP caching only - any non-blank version will result in a large max-age Cache-Control header. Note that this does not affect the Last-Modified header.
   * @returns any The avatar of the project matching the supplied <strong>moduleKey</strong>.
   * @throws ApiError
   */
  public static getAvatar(
    hookKey: string,
    version?: string,
  ): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/hooks/{hookKey}/avatar',
      path: {
        'hookKey': hookKey,
      },
      query: {
        'version': version,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to view the project.`,
        404: `The specified project does not exist.`,
      },
    });
  }
  /**
   * Get projects
   * Retrieve a page of projects.
   *
   * Only projects for which the authenticated user has the <strong>PROJECT_VIEW</strong> permission will be returned.
   * @param name Name to filter by.
   * @param permission Permission to filter by
   * @param start Start number for the page (inclusive). If not passed, first page is assumed.
   * @param limit Number of items to return. If not passed, a page size of 25 is used.
   * @returns any A page of projects.
   * @throws ApiError
   */
  public static getProjects(
    name?: string,
    permission?: string,
    start?: number,
    limit?: number,
  ): CancelablePromise<{
    isLastPage?: boolean;
    limit?: number;
    nextPageStart?: number;
    size?: number;
    start?: number;
    values?: Array<RestProject>;
  }> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects',
      query: {
        'name': name,
        'permission': permission,
        'start': start,
        'limit': limit,
      },
      errors: {
        400: `The permission level is unknown or not related to projects.`,
      },
    });
  }
  /**
   * Create a new project
   * Create a new project.
   *
   * To include a custom avatar for the project, the project definition should contain an additional attribute with the key <code>avatar</code> and the value a data URI containing Base64-encoded image data. The URI should be in the following format: <pre>    data:(content type, e.g. image/png);base64,(data) </pre>If the data is not Base64-encoded, or if a character set is defined in the URI, or the URI is otherwise invalid, <em>project creation will fail</em>.
   *
   * The authenticated user must have <strong>PROJECT_CREATE</strong> permission to call this resource.
   * @param requestBody The project.
   * @returns RestProject The newly created project.
   * @throws ApiError
   */
  public static createProject(
    requestBody?: RestProject,
  ): CancelablePromise<RestProject> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/latest/projects',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `The currently authenticated user has insufficient permissions to update the project.`,
        401: `The currently authenticated user has insufficient permissions to create a project.`,
        409: `The project key or name is already in use.`,
      },
    });
  }
  /**
   * Delete project
   * Delete the project matching the supplied <strong>projectKey</strong>.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for the specified project to call this resource.
   * @param projectKey The project key.
   * @returns void
   * @throws ApiError
   */
  public static deleteProject(
    projectKey: string,
  ): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/latest/projects/{projectKey}',
      path: {
        'projectKey': projectKey,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to delete the project.`,
        404: `The specified project does not exist.`,
        409: `The project can not be deleted as it contains repositories.`,
      },
    });
  }
  /**
   * Get a project
   * Retrieve the project matching the supplied <strong>projectKey</strong>.
   *
   * The authenticated user must have <strong>PROJECT_VIEW</strong> permission for the specified project to call this resource.
   * @param projectKey The project key.
   * @returns RestProject The project matching the supplied <strong>projectKey</strong>.
   * @throws ApiError
   */
  public static getProject(
    projectKey: string,
  ): CancelablePromise<RestProject> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}',
      path: {
        'projectKey': projectKey,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to view the project.`,
        404: `The specified project does not exist.`,
      },
    });
  }
  /**
   * Update project
   * Update the project matching the <strong>projectKey</strong> supplied in the resource path.
   *
   * To include a custom avatar for the updated project, the project definition should contain an additional attribute with the key <code>avatar</code> and the value a data URI containing Base64-encoded image data. The URI should be in the following format:
   * ```    data:(content type, e.g. image/png);base64,(data)```
   *
   * If the data is not Base64-encoded, or if a character set is defined in the URI, or the URI is otherwise invalid, <em>project creation will fail</em>.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for the specified project to call this resource.
   * @param projectKey The project key.
   * @param requestBody Project parameters to update.
   * @returns RestProject The updated project. The project's key <strong>was not</strong> updated.
   * @throws ApiError
   */
  public static updateProject(
    projectKey: string,
    requestBody?: RestProject,
  ): CancelablePromise<RestProject> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/latest/projects/{projectKey}',
      path: {
        'projectKey': projectKey,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `The project was not updated due to a validation error.`,
        401: `The currently authenticated user has insufficient permissions to update the project.`,
        404: `The specified project does not exist.`,
      },
    });
  }
  /**
   * Get avatar for project
   * Retrieve the avatar for the project matching the supplied <strong>projectKey</strong>.
   *
   * The authenticated user must have <strong>PROJECT_VIEW</strong> permission for the specified project to call this resource.
   * @param projectKey The project key.
   * @param s The desired size of the image. The server will return an image as close as possible to the specified size.
   * @returns any The avatar of the project matching the supplied <strong>projectKey</strong>.
   * @throws ApiError
   */
  public static getProjectAvatar(
    projectKey: string,
    s?: string,
  ): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}/avatar.png',
      path: {
        'projectKey': projectKey,
      },
      query: {
        's': s,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to view the project.`,
        404: `The specified project does not exist.`,
      },
    });
  }
  /**
   * Update project avatar
   * Update the avatar for the project matching the supplied <strong>projectKey</strong>.
   *
   * This resource accepts POST multipart form data, containing a single image in a form-field named 'avatar'.
   *
   * There are configurable server limits on both the dimensions (1024x1024 pixels by default) and uploaded file size (1MB by default). Several different image formats are supported, but <strong>PNG</strong> and <strong>JPEG</strong> are preferred due to the file size limit.
   *
   * This resource has Cross-Site Request Forgery (XSRF) protection. To allow the request to pass the XSRF check the caller needs to send an <code>X-Atlassian-Token</code> HTTP header with the value <code>no-check</code>.
   *
   * An example <a href="http://curl.haxx.se/">curl</a> request to upload an image name 'avatar.png' would be: ```curl -X POST -u username:password -H "X-Atlassian-Token: no-check" http://example.com/rest/api/1.0/projects/STASH/avatar.png -F avatar=@avatar.png ```
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for the specified project to call this resource.
   * @param projectKey The project key.
   * @param formData The mutlipart form data containing the file.
   * @returns any The avatar was uploaded successfully.
   * @throws ApiError
   */
  public static uploadAvatar(
    projectKey: string,
    formData?: ExampleAvatarMultipartFormData,
  ): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/latest/projects/{projectKey}/avatar.png',
      path: {
        'projectKey': projectKey,
      },
      formData: formData,
      mediaType: 'multipart/form-data',
      errors: {
        401: `The currently authenticated user has insufficient permissions to update the project.`,
        404: `The specified project does not exist.`,
      },
    });
  }
  /**
   * Get configured hook scripts
   * Return a page of hook scripts configured for the specified project.
   *
   * This endpoint requires **PROJECT_ADMIN** permission.
   * @param projectKey The project key.
   * @param start Start number for the page (inclusive). If not passed, first page is assumed.
   * @param limit Number of items to return. If not passed, a page size of 25 is used.
   * @returns any A page of hook scripts.
   * @throws ApiError
   */
  public static getConfigurations(
    projectKey: string,
    start?: number,
    limit?: number,
  ): CancelablePromise<{
    isLastPage?: boolean;
    limit?: number;
    nextPageStart?: number;
    size?: number;
    start?: number;
    values?: Array<RestHookScriptConfig>;
  }> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}/hook-scripts',
      path: {
        'projectKey': projectKey,
      },
      query: {
        'start': start,
        'limit': limit,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to view the specified project.`,
        404: `The specified project does not exist.`,
      },
    });
  }
  /**
   * Remove a hook script
   * Removes the hook script from the set of hook scripts configured to run in all repositories under the project.
   *
   * This endpoint requires **PROJECT_ADMIN** permission.
   * @param projectKey The project key.
   * @param scriptId The ID of the hook script
   * @returns void
   * @throws ApiError
   */
  public static removeConfiguration(
    projectKey: string,
    scriptId: string,
  ): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/latest/projects/{projectKey}/hook-scripts/{scriptId}',
      path: {
        'projectKey': projectKey,
        'scriptId': scriptId,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to view the specified project.`,
        404: `The project key or hook script ID supplied does not exist.`,
      },
    });
  }
  /**
   * Create/update a hook script
   * Creates/updates the hook script configuration for the provided hook script and project.
   *
   * This endpoint requires **PROJECT_ADMIN** permission.
   * @param projectKey The project key.
   * @param scriptId The ID of the hook script
   * @param requestBody The hook triggers for which the hook script should be run
   * @returns RestHookScriptConfig The updated hook script.
   * @throws ApiError
   */
  public static setConfiguration(
    projectKey: string,
    scriptId: string,
    requestBody?: RestHookScriptTriggers,
  ): CancelablePromise<RestHookScriptConfig> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/latest/projects/{projectKey}/hook-scripts/{scriptId}',
      path: {
        'projectKey': projectKey,
        'scriptId': scriptId,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `The hook script was not created/updated due to a validation error.`,
        401: `The currently authenticated user has insufficient permissions to view the specified project.`,
        404: `The project key supplied does not exist.`,
      },
    });
  }
  /**
   * Revoke project permissions
   * Revoke all permissions for the specified project for the given groups and users.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for the specified project or a higher global permission to call this resource.
   *
   * In addition, a user may not revoke a group's permission if their own permission would be revoked as a result, nor may they revoke their own permission unless they have a global permission that already implies that permission.
   * @param projectKey The project key
   * @param user The names of the users
   * @param group The names of the groups
   * @returns void
   * @throws ApiError
   */
  public static revokePermissions(
    projectKey: string,
    user?: string,
    group?: string,
  ): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/latest/projects/{projectKey}/permissions',
      path: {
        'projectKey': projectKey,
      },
      query: {
        'user': user,
        'group': group,
      },
      errors: {
        400: `No permissions were revoked because the request was invalid. No users or groups were provided.`,
        401: `The currently authenticated user is not an administrator for the specifiedspecified project.`,
        404: `The specified project does not exist, or one or more of the users or groups provided does not exist.`,
        409: `The action was disallowed as it would revoke the currently authenticated user's permission on the project.`,
      },
    });
  }
  /**
   * Revoke group project permission
   *  Revoke all permissions for the specified project for a group.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for the specified project or a higher global permission to call this resource.
   *
   * In addition, a user may not revoke a group's permissions if it will reduce their own permission level.
   * @param projectKey The project key
   * @param name The name of the group
   * @returns void
   * @throws ApiError
   */
  public static revokePermissionsForGroup1(
    projectKey: string,
    name?: string,
  ): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/latest/projects/{projectKey}/permissions/groups',
      path: {
        'projectKey': projectKey,
      },
      query: {
        'name': name,
      },
      errors: {
        401: `The currently authenticated user is not an administrator for the specifiedspecified project.`,
        404: `The specified project does not exist.`,
        409: ` The action was disallowed as it would reduce the currently authenticated user'spermission level.`,
      },
    });
  }
  /**
   * Get groups with permission to project
   * Retrieve a page of groups that have been granted at least one permission for the specified project.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for the specified project or a higher global permission to call this resource.
   * @param projectKey The project key
   * @param filter If specified only group names containing the supplied string will be returned
   * @param start Start number for the page (inclusive). If not passed, first page is assumed.
   * @param limit Number of items to return. If not passed, a page size of 25 is used.
   * @returns any A page of groups and their highest permissions for the specified project.
   * @throws ApiError
   */
  public static getGroupsWithAnyPermission1(
    projectKey: string,
    filter?: string,
    start?: number,
    limit?: number,
  ): CancelablePromise<{
    isLastPage?: boolean;
    limit?: number;
    nextPageStart?: number;
    size?: number;
    start?: number;
    values?: Array<RestPermittedGroup>;
  }> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}/permissions/groups',
      path: {
        'projectKey': projectKey,
      },
      query: {
        'filter': filter,
        'start': start,
        'limit': limit,
      },
      errors: {
        401: `The currently authenticated user is not a project administrator for the specified project.`,
        404: `The specified project does not exist.`,
      },
    });
  }
  /**
   * Update group project permission
   * Promote or demote a group's permission level for the specified project.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for the specified project or a higher global permission to call this resource. In addition, a user may not demote a group's permission level if theirown permission level would be reduced as a result.
   * @param projectKey The project key
   * @param name The names of the groups
   * @param permission The permission to grant.See the [permissions documentation](https://confluence.atlassian.com/display/BitbucketServer/Using+project+permissions)for a detailed explanation of what each permission entails. Available project permissions are:
   *
   * - PROJECT_READ
   * - PROJECT_WRITE
   * - PROJECT_ADMIN
   *
   *
   *
   * @returns void
   * @throws ApiError
   */
  public static setPermissionForGroups1(
    projectKey: string,
    name?: string,
    permission?: string,
  ): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/latest/projects/{projectKey}/permissions/groups',
      path: {
        'projectKey': projectKey,
      },
      query: {
        'name': name,
        'permission': permission,
      },
      errors: {
        400: `The request was malformed or the specified permission does not exist.`,
        401: `The currently authenticated user is not an administrator for the specifiedspecified project.`,
        403: `The action was disallowed as it would reduce the currently authenticated user'spermission level.`,
        404: `The specified project does not exist.`,
      },
    });
  }
  /**
   * Get groups without project permission
   * Retrieve a page of groups that have no granted permissions for the specified project.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for the specified project or a higher
   * @param projectKey The project key
   * @param filter If specified only group names containing the supplied string will be returned
   * @param start Start number for the page (inclusive). If not passed, first page is assumed.
   * @param limit Number of items to return. If not passed, a page size of 25 is used.
   * @returns any A page of groups that have not been granted any permissions for the specifiedproject.
   * @throws ApiError
   */
  public static getGroupsWithoutAnyPermission1(
    projectKey: string,
    filter?: string,
    start?: number,
    limit?: number,
  ): CancelablePromise<{
    isLastPage?: boolean;
    limit?: number;
    nextPageStart?: number;
    size?: number;
    start?: number;
    values?: Array<RestDetailedGroup>;
  }> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}/permissions/groups/none',
      path: {
        'projectKey': projectKey,
      },
      query: {
        'filter': filter,
        'start': start,
        'limit': limit,
      },
      errors: {
        401: `The currently authenticated user is not a project administrator for thespecified project.`,
        404: `The specified project does not exist.`,
      },
    });
  }
  /**
   * Search project permissions
   * Search direct and implied permissions of principals (users and groups). This endpoint returns a superset of the results returned by the /users and /groups endpoints because it allows filtering by global permissions too.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for the specified project or a higher global permission to call this resource.
   * @param projectKey The project key
   * @param permission Permissions to filter by. See the [permissions documentation](https://confluence.atlassian.com/display/BitbucketServer/Using+project+permissions)for a detailed explanation of what each permission entails. This parameter can be specified multiple times to filter by more than one permission, and can contain global and project permissions.
   *
   *
   * @param filterText Name of the user or group to filter the name of
   * @param type Type of entity (user or group)Valid entity types are:
   *
   * - USER- GROUP
   * @returns any default response
   * @throws ApiError
   */
  public static searchPermissions(
    projectKey: string,
    permission?: string,
    filterText?: string,
    type?: string,
  ): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}/permissions/search',
      path: {
        'projectKey': projectKey,
      },
      query: {
        'permission': permission,
        'filterText': filterText,
        'type': type,
      },
    });
  }
  /**
   * Revoke user project permission
   * Revoke all permissions for the specified project for a user.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for the specified project or a higher global permission to call this resource.
   *
   * In addition, a user may not revoke their own project permissions if they do not have a higher global permission.
   * @param projectKey The project key
   * @param name The name of the user
   * @returns void
   * @throws ApiError
   */
  public static revokePermissionsForUser1(
    projectKey: string,
    name?: string,
  ): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/latest/projects/{projectKey}/permissions/users',
      path: {
        'projectKey': projectKey,
      },
      query: {
        'name': name,
      },
      errors: {
        401: `The currently authenticated user is not an administrator for the specifiedspecified project.`,
        404: `The specified project does not exist.`,
        409: ` The action was disallowed as it would reduce the currently authenticated user'spermission level.`,
      },
    });
  }
  /**
   * Get users with permission to project
   * Retrieve a page of users that have been granted at least one permission for the specified project.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for the specified project or a higher global permission to call this resource.
   * @param projectKey The project key
   * @param filter If specified only user names containing the supplied string will be returned
   * @param start Start number for the page (inclusive). If not passed, first page is assumed.
   * @param limit Number of items to return. If not passed, a page size of 25 is used.
   * @returns any A page of users and their highest permissions for the specified project.
   * @throws ApiError
   */
  public static getUsersWithAnyPermission1(
    projectKey: string,
    filter?: string,
    start?: number,
    limit?: number,
  ): CancelablePromise<{
    isLastPage?: boolean;
    limit?: number;
    nextPageStart?: number;
    size?: number;
    start?: number;
    values?: Array<RestPermittedUser>;
  }> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}/permissions/users',
      path: {
        'projectKey': projectKey,
      },
      query: {
        'filter': filter,
        'start': start,
        'limit': limit,
      },
      errors: {
        401: `The currently authenticated user is not a project administrator for thespecified project.`,
        404: `The specified project does not exist.`,
      },
    });
  }
  /**
   * Update user project permission
   * Promote or demote a user's permission level for the specified project.
   *
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for the specified project or a higher global permission to call this resource. In addition, a user may not reduce their own permission level unless they have a global permission that already implies that permission.
   * @param projectKey The project key
   * @param name The names of the users
   * @param permission The permission to grant.See the [permissions documentation](https://confluence.atlassian.com/display/BitbucketServer/Using+project+permissions)for a detailed explanation of what each permission entails. Available project permissions are:
   *
   * - PROJECT_READ
   * - PROJECT_WRITE
   * - PROJECT_ADMIN
   *
   *
   *
   * @returns void
   * @throws ApiError
   */
  public static setPermissionForUsers1(
    projectKey: string,
    name?: string,
    permission?: string,
  ): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/latest/projects/{projectKey}/permissions/users',
      path: {
        'projectKey': projectKey,
      },
      query: {
        'name': name,
        'permission': permission,
      },
      errors: {
        400: `The request was malformed or the specified permission does not exist.`,
        401: `The currently authenticated user is not an administrator for the specifiedspecified project.`,
        403: `The action was disallowed as it would reduce the currently authenticated user'spermission level.`,
        404: `The specified project does not exist.`,
      },
    });
  }
  /**
   * Get users without project permission
   * Retrieve a page of <i>licensed</i> users that have no granted permissions for the specified project.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for the specified project or a higher global permission to call this resource.
   * @param projectKey The project key
   * @param filter If specified only user names containing the supplied string will be returned
   * @param start Start number for the page (inclusive). If not passed, first page is assumed.
   * @param limit Number of items to return. If not passed, a page size of 25 is used.
   * @returns any A page of users that have not been granted any permissions for the specified project
   * @throws ApiError
   */
  public static getUsersWithoutPermission(
    projectKey: string,
    filter?: string,
    start?: number,
    limit?: number,
  ): CancelablePromise<{
    isLastPage?: boolean;
    limit?: number;
    nextPageStart?: number;
    size?: number;
    start?: number;
    values?: Array<RestApplicationUser>;
  }> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}/permissions/users/none',
      path: {
        'projectKey': projectKey,
      },
      query: {
        'filter': filter,
        'start': start,
        'limit': limit,
      },
      errors: {
        401: `The currently authenticated user is not a project administrator for thespecified project.`,
        404: `The specified project does not exist.`,
      },
    });
  }
  /**
   * Check default project permission
   * Check whether the specified permission is the default permission (granted to all users) for a project.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for the specified project or a higher global permission to call this resource.
   * @param projectKey The project key
   * @param permission The permission to grant. Available project permissions are:
   *
   * - PROJECT_READ
   * - PROJECT_WRITE
   * - PROJECT_ADMIN
   *
   *
   *
   * @returns RestPermitted A simple entity indicating whether the specified permission is the defaultpermission for this project.
   * @throws ApiError
   */
  public static hasAllUserPermission(
    projectKey: string,
    permission: string,
  ): CancelablePromise<RestPermitted> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}/permissions/{permission}/all',
      path: {
        'projectKey': projectKey,
        'permission': permission,
      },
      errors: {
        400: `The request was malformed or the specified permission does not exist.`,
        401: `The currently authenticated user is not an administrator for the specifiedspecified project.`,
        403: `The action was disallowed as it would reduce the currently authenticated user'spermission level.`,
        404: `The specified project does not exist.`,
      },
    });
  }
  /**
   * Grant project permission
   * Grant or revoke a project permission to all users, i.e. set the default permission.
   *
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for the specified project or a higher
   * global permission to call this resource.
   * @param projectKey The project key
   * @param permission The permission to grant. Available project permissions are:
   *
   * - PROJECT_READ
   * - PROJECT_WRITE
   * - PROJECT_ADMIN
   *
   *
   *
   * @param allow <em>true</em> to grant the specified permission to all users, or <em>false</em> to revoke it
   * @returns void
   * @throws ApiError
   */
  public static modifyAllUserPermission(
    projectKey: string,
    permission: string,
    allow?: string,
  ): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/latest/projects/{projectKey}/permissions/{permission}/all',
      path: {
        'projectKey': projectKey,
        'permission': permission,
      },
      query: {
        'allow': allow,
      },
      errors: {
        400: `The request was malformed or the specified permission does not exist.`,
        401: `The currently authenticated user is not an administrator for the specified project.`,
        404: `The specified project does not exist.`,
      },
    });
  }
  /**
   * Get repositories for project
   * Retrieve repositories from the project corresponding to the supplied <strong>projectKey</strong>.
   *
   * The authenticated user must have <strong>PROJECT_READ</strong> permission for the specified project to call this resource.
   * @param projectKey The project key.
   * @param start Start number for the page (inclusive). If not passed, first page is assumed.
   * @param limit Number of items to return. If not passed, a page size of 25 is used.
   * @returns any The repositories matching the supplied <strong>projectKey</strong>.
   * @throws ApiError
   */
  public static getRepositories(
    projectKey: string,
    start?: number,
    limit?: number,
  ): CancelablePromise<{
    isLastPage?: boolean;
    limit?: number;
    nextPageStart?: number;
    size?: number;
    start?: number;
    values?: Array<RestRepository>;
  }> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}/repos',
      path: {
        'projectKey': projectKey,
      },
      query: {
        'start': start,
        'limit': limit,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to see the specified project.`,
        404: `The specified project does not exist.`,
      },
    });
  }

  /**
   * Get repositories for project
   * Retrieve repositories from the project corresponding to the supplied <strong>projectKey</strong>.
   *
   * The authenticated user must have <strong>PROJECT_READ</strong> permission for the specified project to call this resource.
   * @param projectKey The project key.
   * @param repositorySlug The short name of the repository.
   * @param path The path to the file
   * @returns any The content of the file.
   * @throws ApiError
   */
  public static getFileContent(
    projectKey: string,
    repositorySlug: string,
    path: string,
  ): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}/repos/{repositorySlug}/raw/{path}',
      path: {
        'projectKey': projectKey,
        'repositorySlug': repositorySlug,
        'path': path,
      },
      query: {
        'at': 'master',
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to see the specified project.`,
        404: `The specified project does not exist.`,
      },
    });
  }

  /**
   * Get repositories for project
   * Retrieve repositories from the project corresponding to the supplied <strong>projectKey</strong>.
   *
   * The authenticated user must have <strong>PROJECT_READ</strong> permission for the specified project to call this resource.
   * @param projectKey The project key.
   * @param repositorySlug The short name of the repository.
   * @param path The path to the file
   * @param limit Number of items to return. If not passed, a page size of 25 is used.
   * @returns any The list of files in the directory.
   * @throws ApiError
   */
  public static getFilesFromPath(
    projectKey: string,
    repositorySlug: string,
    path: string,
    limit: number,
  ): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}/repos/{repositorySlug}/files/{path}',
      path: {
        'projectKey': projectKey,
        'repositorySlug': repositorySlug,
        'path': path,
      },
      query: {
        'at': 'master',
        'limit': limit,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to see the specified project.`,
        404: `The specified project does not exist.`,
      },
    });
  }
  /**
   * Create repository
   * Create a new repository. Requires an existing project in which this repository will be created. The only parameters which will be used are name and scmId.
   *
   * The authenticated user must have <strong>REPO_CREATE</strong> permission or higher, for the context project to call this resource.
   * @param projectKey The project key.
   * @param requestBody The repository
   * @returns RestRepository The newly created repository.
   * @throws ApiError
   */
  public static createRepository(
    projectKey: string,
    requestBody?: RestRepository,
  ): CancelablePromise<RestRepository> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/latest/projects/{projectKey}/repos',
      path: {
        'projectKey': projectKey,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `The repository was not created due to a validation error.`,
        401: `The currently authenticated user has insufficient permissions to create a repository.`,
        409: `A repository with same name already exists.`,
      },
    });
  }
  /**
   * Delete repository
   * Schedule the repository matching the supplied <strong>projectKey</strong> and <strong>repositorySlug</strong> to be deleted.
   *
   * The authenticated user must have sufficient permissions specified by the repository delete policy to call this resource. The default permission required is <strong>REPO_ADMIN</strong> permission.
   * @param projectKey The project key.
   * @param repositorySlug The repository slug.
   * @returns any The repository has been scheduled for deletion.
   * @throws ApiError
   */
  public static deleteRepository(
    projectKey: string,
    repositorySlug: string,
  ): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/latest/projects/{projectKey}/repos/{repositorySlug}',
      path: {
        'projectKey': projectKey,
        'repositorySlug': repositorySlug,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to delete the repository.`,
      },
    });
  }
  /**
   * Get repository
   * Retrieve the repository matching the supplied <strong>projectKey</strong> and <strong>repositorySlug</strong>.
   *
   * The authenticated user must have <strong>REPO_READ</strong> permission for the specified repository to call this resource.
   * @param projectKey The project key.
   * @param repositorySlug The repository slug.
   * @returns RestRepository The repository which matches the supplied <strong>projectKey</strong> and <strong>repositorySlug</strong>.
   * @throws ApiError
   */
  public static getRepository(
    projectKey: string,
    repositorySlug: string,
  ): CancelablePromise<RestRepository> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}/repos/{repositorySlug}',
      path: {
        'projectKey': projectKey,
        'repositorySlug': repositorySlug,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to see the specified repository.`,
        404: `The specified repository does not exist.`,
      },
    });
  }
  /**
   * Fork repository
   * Create a new repository forked from an existing repository.
   *
   * The JSON body for this <code>POST</code> is not required to contain <i>any</i> properties. Even the name may be omitted. The following properties will be used, if provided:
   *
   * - <code>"name":"Fork name"</code> - Specifies the forked repository's name
   * - Defaults to the name of the origin repository if not specified
   * - <code>"defaultBranch":"main"</code> - Specifies the forked repository's default branch
   * - Defaults to the origin repository's default branch if not specified
   * - <code>"project":{"key":"TARGET_KEY"}</code> - Specifies the forked repository's target project by key
   * - Defaults to the current user's personal project if not specified
   *
   *
   * The authenticated user must have <strong>REPO_READ</strong> permission for the specified repository and <strong>PROJECT_ADMIN</strong> on the target project to call this resource. Note that users <i>always</i> have <b>PROJECT_ADMIN</b> permission on their personal projects.
   * @param projectKey The project key.
   * @param repositorySlug The repository slug.
   * @param requestBody The rest fork.
   * @returns RestRepository The newly created fork.
   * @throws ApiError
   */
  public static forkRepository(
    projectKey: string,
    repositorySlug: string,
    requestBody?: RestRepository,
  ): CancelablePromise<RestRepository> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/latest/projects/{projectKey}/repos/{repositorySlug}',
      path: {
        'projectKey': projectKey,
        'repositorySlug': repositorySlug,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `A validation error prevented the fork from being created. Possible validation errors include: The name or slug for the fork collides with another repository in the target project; an SCM type was specified in the JSON body; a project was specified in the JSON body without a "key" property.`,
        401: `The currently authenticated user has insufficient permissions to create a fork.`,
        404: `The specified repository does not exist, or, if a target project was specified, the target project does not exist.`,
      },
    });
  }
  /**
   * Update repository
   * Update the repository matching the <strong>repositorySlug</strong> supplied in the resource path.
   *
   * The repository's slug is derived from its name. If the name changes the slug may also change.
   *
   * This resource can be used to change the repository's default branch by specifying a new default branch in the request. For example: <code>"defaultBranch":"main"</code>
   *
   * This resource can be used to move the repository to a different project by specifying a new project in the request. For example: <code>"project":{"key":"NEW_KEY"}</code>
   *
   * The authenticated user must have <strong>REPO_ADMIN</strong> permission for the specified repository to call this resource.
   * @param projectKey The project key.
   * @param repositorySlug The repository slug.
   * @param requestBody The updated repository.
   * @returns RestRepository The updated repository.
   * @throws ApiError
   */
  public static updateRepository(
    projectKey: string,
    repositorySlug: string,
    requestBody?: RestRepository,
  ): CancelablePromise<RestRepository> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/latest/projects/{projectKey}/repos/{repositorySlug}',
      path: {
        'projectKey': projectKey,
        'repositorySlug': repositorySlug,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `The repository was not updated due to a validation error.`,
        401: `The currently authenticated user has insufficient permissions to update a repository.`,
        403: `Cannot archive repository because it has open pull requests.`,
        404: `The specified repository does not exist.`,
        409: `A repository with the same name as the target already exists, or the repository is archived.`,
      },
    });
  }
  /**
   * Get repository contributing guidelines
   * Retrieves the contributing guidelines for the repository, if they've been defined.
   *
   * This checks the repository for a CONTRIBUTING file, optionally with an md or txt extension, and, if found, streams it. By default, the <i>raw content</i> of the file is streamed. Appending <code>?markup</code> to the URL will stream an HTML-rendered version instead.
   *
   * The authenticated user must have <strong>REPO_READ</strong> permission for the specified repository to call this resource.
   * @param projectKey The project key.
   * @param repositorySlug The repository slug.
   * @param at A specific commit or ref to retrieve the guidelines at, or the default branch if not specified
   * @param markup If present or <code>"true"</code>, triggers the raw content to be markup-rendered and returned as HTML; otherwise, if not specified, or any value other than <code>"true"</code>, the content is streamed without markup
   * @param htmlEscape (Optional) true if HTML should be escaped in the input markup, false otherwise. If not specified, the value of the <code>markup.render.html.escape</code> property, which is <code>true</code> by default, will be used
   * @param includeHeadingId (Optional) true if headings should contain an ID based on the heading content. If not specified, the value of the <code>markup.render.headerids</code> property, which is false by default, will be used
   * @param hardwrap (Optional) Whether the markup implementation should convert newlines to breaks. If not specified, the value of the <code>markup.render.hardwrap</code> property, which is <code>true</code> by default, will be used
   * @returns any The contributing guidelines for the repository.
   * @throws ApiError
   */
  public static streamContributing(
    projectKey: string,
    repositorySlug: string,
    at?: string,
    markup?: string,
    htmlEscape?: string,
    includeHeadingId?: string,
    hardwrap?: string,
  ): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}/repos/{repositorySlug}/contributing',
      path: {
        'projectKey': projectKey,
        'repositorySlug': repositorySlug,
      },
      query: {
        'at': at,
        'markup': markup,
        'htmlEscape': htmlEscape,
        'includeHeadingId': includeHeadingId,
        'hardwrap': hardwrap,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to read the repository.`,
        404: `The specified repository does not exist.`,
      },
    });
  }
  /**
   * Get repository default branch
   * Retrieves the repository's <i>configured</i> default branch.
   *
   * Every repository has a <i>configured</i> default branch, but that branch may not actually <i>exist</i> in the repository. For example, a newly-created repository will have a configured default branch even though no branches have been pushed yet.
   *
   * The authenticated user must have <strong>REPO_READ</strong> permission for the specified repository to call this resource.
   * @param projectKey The project key.
   * @param repositorySlug The repository slug.
   * @returns RestMinimalRef The configured default branch for the repository.
   * @throws ApiError
   */
  public static getDefaultBranch2(
    projectKey: string,
    repositorySlug: string,
  ): CancelablePromise<RestMinimalRef> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}/repos/{repositorySlug}/default-branch',
      path: {
        'projectKey': projectKey,
        'repositorySlug': repositorySlug,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to read the repository.`,
        404: `The specified repository does not exist, or its configured default branch does not exist.`,
      },
    });
  }
  /**
   * Update default branch for repository
   * Update the default branch of a repository.
   *
   * The authenticated user must have <strong>REPO_ADMIN</strong> permission for the specified repository to call this resource.
   * @param projectKey The project key.
   * @param repositorySlug The repository slug.
   * @param requestBody The branch to set as default
   * @returns void
   * @throws ApiError
   */
  public static setDefaultBranch2(
    projectKey: string,
    repositorySlug: string,
    requestBody?: RestBranch,
  ): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/latest/projects/{projectKey}/repos/{repositorySlug}/default-branch',
      path: {
        'projectKey': projectKey,
        'repositorySlug': repositorySlug,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        401: `The authenticated user does not have permission to modify the default branch.`,
        404: `The specified repository does not exist.`,
      },
    });
  }
  /**
   * Get repository forks
   * Retrieve repositories which have been forked from this one. Unlike #getRelatedRepositories(Repository, PageRequest) related repositories, this only looks at a given repository's direct forks. If those forks have themselves been the origin of more forks, such "grandchildren" repositories will not be retrieved.
   *
   * Only repositories to which the authenticated user has <b>REPO_READ</b> permission will be included, even if other repositories have been forked from this one.
   * @param projectKey The project key.
   * @param repositorySlug The repository slug.
   * @param start Start number for the page (inclusive). If not passed, first page is assumed.
   * @param limit Number of items to return. If not passed, a page size of 25 is used.
   * @returns any A page of repositories related to the request repository.
   * @throws ApiError
   */
  public static getForkedRepositories(
    projectKey: string,
    repositorySlug: string,
    start?: number,
    limit?: number,
  ): CancelablePromise<{
    isLastPage?: boolean;
    limit?: number;
    nextPageStart?: number;
    size?: number;
    start?: number;
    values?: Array<RestRepository>;
  }> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}/repos/{repositorySlug}/forks',
      path: {
        'projectKey': projectKey,
        'repositorySlug': repositorySlug,
      },
      query: {
        'start': start,
        'limit': limit,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to see the request repository.`,
        404: `The request repository does not exist.`,
      },
    });
  }
  /**
   * Get repository license
   * Retrieves the license for the repository, if it's been defined.
   *
   * This checks the repository for a <pre>LICENSE</pre> file, optionally with an <pre>md</pre> or <pre>txt</pre>extension, and, if found, streams it. By default, the <i>raw content</i> of the file is streamed. Appending <pre>?markup</pre> to the URL will stream an HTML-rendered version instead.
   *
   * The authenticated user must have <strong>REPO_READ</strong> permission for the specified repository to call this resource.
   * @param projectKey The project key.
   * @param repositorySlug The repository slug.
   * @param at A specific commit or ref to retrieve the guidelines at, or the default branch if not specified
   * @param markup If present or <code>"true"</code>, triggers the raw content to be markup-rendered and returned as HTML; otherwise, if not specified, or any value other than <code>"true"</code>, the content is streamed without markup
   * @param htmlEscape (Optional) true if HTML should be escaped in the input markup, false otherwise. If not specified, the value of the <code>markup.render.html.escape</code> property, which is <code>true</code> by default, will be used
   * @param includeHeadingId (Optional) true if headings should contain an ID based on the heading content. If not specified, the value of the <code>markup.render.headerids</code> property, which is false by default, will be used
   * @param hardwrap (Optional) Whether the markup implementation should convert newlines to breaks. If not specified, the value of the <code>markup.render.hardwrap</code> property, which is <code>true</code> by default, will be used
   * @returns any The license for the repository.
   * @throws ApiError
   */
  public static streamLicense(
    projectKey: string,
    repositorySlug: string,
    at?: string,
    markup?: string,
    htmlEscape?: string,
    includeHeadingId?: string,
    hardwrap?: string,
  ): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}/repos/{repositorySlug}/license',
      path: {
        'projectKey': projectKey,
        'repositorySlug': repositorySlug,
      },
      query: {
        'at': at,
        'markup': markup,
        'htmlEscape': htmlEscape,
        'includeHeadingId': includeHeadingId,
        'hardwrap': hardwrap,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to read the repository.`,
        404: `The specified repository does not exist.`,
      },
    });
  }
  /**
   * Get repository readme
   * Retrieves the README for the repository, if it's been defined.
   *
   * This checks the repository for a <pre>README</pre> file, optionally with an <pre>md</pre> or <pre>txt</pre>extension, and, if found, streams it. By default, the <i>raw content</i> of the file is streamed. Appending <pre>?markup</pre> to the URL will stream an HTML-rendered version instead. Note that, when streaming HTML, relative URLs in the README will not work if applied relative to this URL.
   *
   * The authenticated user must have <strong>REPO_READ</strong> permission for the specified repository to call this resource.
   * @param projectKey The project key.
   * @param repositorySlug The repository slug.
   * @param at A specific commit or ref to retrieve the guidelines at, or the default branch if not specified
   * @param markup If present or <code>"true"</code>, triggers the raw content to be markup-rendered and returned as HTML; otherwise, if not specified, or any value other than <code>"true"</code>, the content is streamed without markup
   * @param htmlEscape (Optional) true if HTML should be escaped in the input markup, false otherwise. If not specified, the value of the <code>markup.render.html.escape</code> property, which is <code>true</code> by default, will be used
   * @param includeHeadingId (Optional) true if headings should contain an ID based on the heading content. If not specified, the value of the <code>markup.render.headerids</code> property, which is false by default, will be used
   * @param hardwrap (Optional) Whether the markup implementation should convert newlines to breaks. If not specified, the value of the <code>markup.render.hardwrap</code> property, which is <code>true</code> by default, will be used
   * @returns any The README for the repository.
   * @throws ApiError
   */
  public static streamReadme(
    projectKey: string,
    repositorySlug: string,
    at?: string,
    markup?: string,
    htmlEscape?: string,
    includeHeadingId?: string,
    hardwrap?: string,
  ): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}/repos/{repositorySlug}/readme',
      path: {
        'projectKey': projectKey,
        'repositorySlug': repositorySlug,
      },
      query: {
        'at': at,
        'markup': markup,
        'htmlEscape': htmlEscape,
        'includeHeadingId': includeHeadingId,
        'hardwrap': hardwrap,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to read the repository.`,
        404: `The specified repository does not exist.`,
      },
    });
  }
  /**
   * Retry repository creation
   * If a create or fork operation fails, calling this method will clean up the broken repository and try again. The repository must be in an INITIALISATION_FAILED state.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for the specified project to call this resource.
   * @param projectKey The project key.
   * @param repositorySlug The repository slug.
   * @returns RestRepository The newly created repository.
   * @throws ApiError
   */
  public static retryCreateRepository(
    projectKey: string,
    repositorySlug: string,
  ): CancelablePromise<RestRepository> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/latest/projects/{projectKey}/repos/{repositorySlug}/recreate',
      path: {
        'projectKey': projectKey,
        'repositorySlug': repositorySlug,
      },
      errors: {
        400: `The repository was not created due to a validation error.`,
        401: `The currently authenticated user has insufficient permissions to create a repository.`,
        404: `The specified repository does not exist.`,
      },
    });
  }
  /**
   * Get related repository
   * Retrieve repositories which are related to this one. Related repositories are from the same Repository#getHierarchyId() hierarchy as this repository.
   *
   * Only repositories to which the authenticated user has <b>REPO_READ</b> permission will be included, even if more repositories are part of this repository's hierarchy.
   * @param projectKey The project key.
   * @param repositorySlug The repository slug.
   * @param start Start number for the page (inclusive). If not passed, first page is assumed.
   * @param limit Number of items to return. If not passed, a page size of 25 is used.
   * @returns any A page of repositories related to the request repository.
   * @throws ApiError
   */
  public static getRelatedRepositories(
    projectKey: string,
    repositorySlug: string,
    start?: number,
    limit?: number,
  ): CancelablePromise<{
    isLastPage?: boolean;
    limit?: number;
    nextPageStart?: number;
    size?: number;
    start?: number;
    values?: Array<RestRepository>;
  }> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}/repos/{repositorySlug}/related',
      path: {
        'projectKey': projectKey,
        'repositorySlug': repositorySlug,
      },
      query: {
        'start': start,
        'limit': limit,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to see the request repository.`,
        404: `The request repository does not exist.`,
      },
    });
  }
  /**
   * Stop enforcing project restriction
   * Delete a specified project settings restriction.
   *
   * If a restriction does not exist for the specified project, namespace, featureKey, and componentKey, the request will be ignored and a 204 response will be returned.
   *
   * The authenticated user must have **PROJECT_ADMIN** permission for the target project to delete a settings restriction.
   * @param projectKey The project key.
   * @param namespace A namespace used to identify the provider of the feature
   * @param featureKey A key to uniquely identify the feature within the provided namespace
   * @param componentKey A key to uniquely identify individually restrictable subcomponents of a feature within the provided feature key and namespace
   * @returns void
   * @throws ApiError
   */
  public static delete9(
    projectKey: string,
    namespace: string,
    featureKey: string,
    componentKey?: string,
  ): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/latest/projects/{projectKey}/settings-restriction',
      path: {
        'projectKey': projectKey,
      },
      query: {
        'namespace': namespace,
        'componentKey': componentKey,
        'featureKey': featureKey,
      },
      errors: {
        400: `The settings restriction was not deleted because the request was invalid. Possible issues include:
                - The namespace was not provided, or longer than 255 characters
                - The featureKey was not provided, or longer than 255 characters
                - The provided componentKey was fewer than 2 characters, or longer than 255 characters`,
        401: `The currently authenticated user has insufficient permissions to delete a settings restriction`,
        404: `The specified project does not exist`,
      },
    });
  }
  /**
   * Get enforcing project setting
   * Get a specified project settings restriction for the given namespace, feature key and component key.
   * Note that not providing the component key will **not** return restrictions for the namespace and feature key with a component key set.
   *
   * The authenticated user must have **PROJECT_VIEW** permission for the target project to retrieve a settings restriction.
   * @param projectKey The project key.
   * @param namespace The namespace used to identify the provider of the feature
   * @param featureKey The feature key to uniquely identify the feature within the provided namespace
   * @param componentKey The component key to uniquely identify individually restrictable subcomponents of a feature within the provided feature key and namespace
   * @returns RestProjectSettingsRestriction The settings restriction associated with the provided namespace and feature key
   * @throws ApiError
   */
  public static get7(
    projectKey: string,
    namespace: string,
    featureKey: string,
    componentKey?: string,
  ): CancelablePromise<RestProjectSettingsRestriction> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}/settings-restriction',
      path: {
        'projectKey': projectKey,
      },
      query: {
        'namespace': namespace,
        'componentKey': componentKey,
        'featureKey': featureKey,
      },
      errors: {
        400: `The settings restriction could not be retrieved because the provided parameters were invalid. Possible issues include:
                - The namespace was not provided, or longer than 255 characters
                - The featureKey was not provided, or longer than 255 characters
                - The provided componentKey was fewer than 2 characters, or longer than 255 characters`,
        401: `The currently authenticated user has insufficient permissions to retrieve a settings restriction`,
        404: `The specified project, or settings restriction does not exist`,
      },
    });
  }
  /**
   * Enforce project restriction
   * Create a new project settings restriction for the given project.
   *
   * The authenticated user must have **PROJECT_ADMIN** permission for the target project to create a settings restriction.
   * @param projectKey The project key.
   * @param requestBody The project settings restriction to create
   * @returns RestProjectSettingsRestriction The settings restriction was successfully created
   * @throws ApiError
   */
  public static create3(
    projectKey: string,
    requestBody: RestProjectSettingsRestrictionRequest,
  ): CancelablePromise<RestProjectSettingsRestriction> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/latest/projects/{projectKey}/settings-restriction',
      path: {
        'projectKey': projectKey,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `The settings restriction was not created because the request was invalid. Possible issues include:
                - The namespace was not provided, or longer than 255 characters
                - The featureKey was not provided, or longer than 255 characters
                - The provided componentKey was fewer than 2 characters, or longer than 255 characters`,
        401: `The currently authenticated user has insufficient permissions to create a settings restriction`,
        404: `The specified project does not exist`,
        409: `A settings restriction with the same namespace, featureKey and componentKey already exists on this project`,
      },
    });
  }
  /**
   * Get all enforcing project settings
   * Get all project settings restrictions for the given namespace and feature key, including those with a component key set.
   *
   * The authenticated user must have **PROJECT_VIEW** permission for the target project to retrieve a settings restrictions.
   * @param projectKey The project key.
   * @param namespace A namespace used to identify the provider of the feature
   * @param featureKey A key to uniquely identify the feature within the provided namespace
   * @param start Start number for the page (inclusive). If not passed, first page is assumed.
   * @param limit Number of items to return. If not passed, a page size of 25 is used.
   * @returns any A page of settings restrictions associated with the provided namespace and feature key
   * @throws ApiError
   */
  public static getAll(
    projectKey: string,
    namespace: string,
    featureKey: string,
    start?: number,
    limit?: number,
  ): CancelablePromise<{
    isLastPage?: boolean;
    limit?: number;
    nextPageStart?: number;
    size?: number;
    start?: number;
    values?: Array<RestProjectSettingsRestriction>;
  }> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}/settings-restriction/all',
      path: {
        'projectKey': projectKey,
      },
      query: {
        'namespace': namespace,
        'featureKey': featureKey,
        'start': start,
        'limit': limit,
      },
      errors: {
        400: `The settings restrictions could not be retrieved because the provided parameters were invalid. Possible issues include:
                - The namespace was not provided, or longer than 255 characters
                - The featureKey was not provided, or longer than 255 characters`,
        401: `The currently authenticated user has insufficient permissions to retrieve project settings restrictions`,
        404: `The specified project does not exist`,
      },
    });
  }
  /**
   * Delete auto decline settings
   * Delete auto decline settings for the supplied project.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for this project to call the resource.
   * @param projectKey The project key
   * @returns void
   * @throws ApiError
   */
  public static deleteAutoDeclineSettings(
    projectKey: string,
  ): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/latest/projects/{projectKey}/settings/auto-decline',
      path: {
        'projectKey': projectKey,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to delete the auto decline settings.`,
        404: `The specified project does not exist.`,
      },
    });
  }
  /**
   * Get auto decline settings
   * Retrieves the auto decline settings for the supplied project. Default settings are returned if no explicit settings have been set for the project.
   * @param projectKey The project key
   * @returns RestAutoDeclineSettings The auto decline settings
   * @throws ApiError
   */
  public static getAutoDeclineSettings(
    projectKey: string,
  ): CancelablePromise<RestAutoDeclineSettings> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}/settings/auto-decline',
      path: {
        'projectKey': projectKey,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to retrieve the auto decline settings.`,
        404: `The specified project does not exist.`,
      },
    });
  }
  /**
   * Create/Update auto decline settings
   * Creates or updates the auto decline settings for the supplied project.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for this project to call the resource.
   * @param projectKey The project key
   * @param requestBody The settings to create or update
   * @returns RestAutoDeclineSettings The auto decline settings
   * @throws ApiError
   */
  public static setAutoDeclineSettings(
    projectKey: string,
    requestBody?: RestAutoDeclineSettingsRequest,
  ): CancelablePromise<RestAutoDeclineSettings> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/latest/projects/{projectKey}/settings/auto-decline',
      path: {
        'projectKey': projectKey,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `inactivityWeeks was not one of 1, 2, 4, 8, or, 12, or the enabled parameter was not included in the request.`,
        401: `The currently authenticated user has insufficient permissions to create or update the auto decline settings.`,
        404: `The specified project does not exist.`,
      },
    });
  }
  /**
   * Delete pull request auto-merge settings
   * Deletes pull request auto-merge settings for the supplied project.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for this project to call the resource.
   * @param projectKey The project key
   * @returns void
   * @throws ApiError
   */
  public static delete4(
    projectKey: string,
  ): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/latest/projects/{projectKey}/settings/auto-merge',
      path: {
        'projectKey': projectKey,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to delete the pull request auto-merge settings.`,
        404: `The specified project does not exist.`,
      },
    });
  }
  /**
   * Get pull request auto-merge settings
   * Retrieves the pull request auto-merge settings for the supplied project. Default settings will be returned if no explicit settings have been set for the project
   *
   * The authenticated user must have <strong>PROJECT_VIEW</strong> permission for this project to call the resource.
   * @param projectKey The project key
   * @returns RestAutoMergeRestrictedSettings The pull request auto-merge settings
   * @throws ApiError
   */
  public static get4(
    projectKey: string,
  ): CancelablePromise<RestAutoMergeRestrictedSettings> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}/settings/auto-merge',
      path: {
        'projectKey': projectKey,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to retrieve the pull request auto-merge settings.`,
        404: `The specified project does not exist.`,
      },
    });
  }
  /**
   * Create or update the pull request auto-merge settings
   * Creates or updates the pull request auto-merge settings for the supplied project, and applies the restriction action specified in the request.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for this project to call the resource.
   * @param projectKey The project key
   * @param requestBody The settings to create or update
   * @returns RestAutoMergeRestrictedSettings The pull request auto-merge settings
   * @throws ApiError
   */
  public static set(
    projectKey: string,
    requestBody?: RestAutoMergeProjectSettingsRequest,
  ): CancelablePromise<RestAutoMergeRestrictedSettings> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/latest/projects/{projectKey}/settings/auto-merge',
      path: {
        'projectKey': projectKey,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `The 'enabled' and 'restrictionAction' fields were not provided correctly.`,
        401: `The currently authenticated user has insufficient permissions to create or update the pull request auto-merge settings.`,
        404: `The specified project does not exist.`,
      },
    });
  }
  /**
   * Get repository hooks
   * Retrieve a page of repository hooks for this project.
   *
   * The authenticated user must have <strong>PROJECT_READ</strong> permission for the specified project to call this resource.
   * @param projectKey The project key.
   * @param type The optional type to filter by.
   * @param start Start number for the page (inclusive). If not passed, first page is assumed.
   * @param limit Number of items to return. If not passed, a page size of 25 is used.
   * @returns any A page of repository hooks with their associated enabled state.
   * @throws ApiError
   */
  public static getRepositoryHooks(
    projectKey: string,
    type?: 'PRE_RECEIVE' | 'POST_RECEIVE',
    start?: number,
    limit?: number,
  ): CancelablePromise<{
    isLastPage?: boolean;
    limit?: number;
    nextPageStart?: number;
    size?: number;
    start?: number;
    values?: Array<RestRepositoryHook>;
  }> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}/settings/hooks',
      path: {
        'projectKey': projectKey,
      },
      query: {
        'type': type,
        'start': start,
        'limit': limit,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to retrieve the hooks.`,
        404: `The specified project does not exist.`,
      },
    });
  }
  /**
   * Get a repository hook
   * Retrieve a repository hook for this project.
   *
   * The authenticated user must have <strong>PROJECT_READ</strong> permission for the specified project to call this resource.
   * @param projectKey The project key.
   * @param hookKey The hook key.
   * @returns RestRepositoryHook Returns the repository hooks with their associated enabled state for the supplied hookKey.
   * @throws ApiError
   */
  public static getRepositoryHook(
    projectKey: string,
    hookKey: string,
  ): CancelablePromise<RestRepositoryHook> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}/settings/hooks/{hookKey}',
      path: {
        'projectKey': projectKey,
        'hookKey': hookKey,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to enable the hook.`,
        404: `The specified repository hook does not exist for the given project, or the project does not exist.`,
      },
    });
  }
  /**
   * Disable repository hook
   * Disable a repository hook for this project.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for the specified project to call this resource.
   * @param projectKey The project key.
   * @param hookKey The hook key.
   * @returns RestRepositoryHook The repository hooks with their associated enabled state for the supplied hookKey.
   * @throws ApiError
   */
  public static disableHook(
    projectKey: string,
    hookKey: string,
  ): CancelablePromise<RestRepositoryHook> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/latest/projects/{projectKey}/settings/hooks/{hookKey}/enabled',
      path: {
        'projectKey': projectKey,
        'hookKey': hookKey,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to disable the hook.`,
        404: `The specified project or hook does not exist.`,
      },
    });
  }
  /**
   * Enable repository hook
   * Enable a repository hook for this project and optionally apply new configuration.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for the specified project to call this resource.
   *
   * A JSON document may be provided to use as the settings for the hook. These structure and validity of the document is decided by the plugin providing the hook.
   * @param projectKey The project key.
   * @param hookKey The hook key.
   * @param contentLength The content length.
   * @returns RestRepositoryHook The repository hooks with their associated enabled state for the supplied hookKey.
   * @throws ApiError
   */
  public static enableHook(
    projectKey: string,
    hookKey: string,
    contentLength?: number,
  ): CancelablePromise<RestRepositoryHook> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/latest/projects/{projectKey}/settings/hooks/{hookKey}/enabled',
      path: {
        'projectKey': projectKey,
        'hookKey': hookKey,
      },
      headers: {
        'Content-Length': contentLength,
      },
      errors: {
        400: `The settings specified are invalid.`,
        401: `The currently authenticated user has insufficient permissions to enable the hook.`,
        404: `The specified project or hook does not exist.`,
      },
    });
  }
  /**
   * Get repository hook settings
   * Retrieve the settings for a repository hook for this project.
   *
   * The authenticated user must have <strong>PROJECT_READ</strong> permission for the specified project to call this resource.
   * @param projectKey The project key.
   * @param hookKey The hook key.
   * @returns ExampleSettings The settings for the hook.
   * @throws ApiError
   */
  public static getSettings(
    projectKey: string,
    hookKey: string,
  ): CancelablePromise<ExampleSettings> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}/settings/hooks/{hookKey}/settings',
      path: {
        'projectKey': projectKey,
        'hookKey': hookKey,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to retrieve the hook settings.`,
        404: `The specified project or hook does not exist.`,
      },
    });
  }
  /**
   * Update repository hook settings
   * Modify the settings for a repository hook for this project.
   *
   * The service will reject any settings which are too large, the current limit is 32KB once serialized.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for the specified project to call this resource.
   *
   * A JSON document can be provided to use as the settings for the hook. These structure and validity of the document is decided by the plugin providing the hook.
   * @param projectKey The project key.
   * @param hookKey The complete module key of the hook module.
   * @param requestBody The raw settings.
   * @returns ExampleSettings The settings for the hook.
   * @throws ApiError
   */
  public static setSettings(
    projectKey: string,
    hookKey: string,
    requestBody?: ExampleSettings,
  ): CancelablePromise<ExampleSettings> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/latest/projects/{projectKey}/settings/hooks/{hookKey}/settings',
      path: {
        'projectKey': projectKey,
        'hookKey': hookKey,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `The settings specified are invalid.`,
        401: `The currently authenticated user has insufficient permissions to modify the hook settings.`,
        404: `The specified project or hook does not exist.`,
      },
    });
  }
  /**
   * Get merge strategy
   * Retrieve the merge strategy configuration for this project and SCM.
   *
   * The authenticated user must have <strong>PROJECT_READ</strong> permission for the context repository to call this resource.
   * @param projectKey The project key.
   * @param scmId The SCM to get strategies for.
   * @returns RestPullRequestSettings The merge configuration of the request project.
   * @throws ApiError
   */
  public static getPullRequestSettings(
    projectKey: string,
    scmId: string,
  ): CancelablePromise<RestPullRequestSettings> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}/settings/pull-requests/{scmId}',
      path: {
        'projectKey': projectKey,
        'scmId': scmId,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to see the request repository.`,
        404: `The request repository does not exist.`,
      },
    });
  }
  /**
   * Update merge strategy
   * Update the pull request merge strategy configuration for this project and SCM.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for the context repository to call this resource.
   *
   * Only the strategies provided will be enabled, the default must be set and included in the set of strategies.
   *
   * An explicitly set pull request merge strategy configuration can be deleted by POSTing a document with an empty "mergeConfig" attribute. i.e:
   * <pre>{
   * "mergeConfig": {}
   * }
   * </pre>
   *
   * Upon completion of this request, the effective configuration will be the configuration explicitly set for the SCM, or if no such explicit configuration is set then the default configuration will be used.
   * @param projectKey The project key.
   * @param scmId The SCM to get strategies for.
   * @param requestBody The settings.
   * @returns RestPullRequestSettings The merge configuration of the request project.
   * @throws ApiError
   */
  public static updatePullRequestSettings(
    projectKey: string,
    scmId: string,
    requestBody?: RestPullRequestSettings,
  ): CancelablePromise<RestPullRequestSettings> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/latest/projects/{projectKey}/settings/pull-requests/{scmId}',
      path: {
        'projectKey': projectKey,
        'scmId': scmId,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `The repository pull request merge strategies were not updated due to a validation error.`,
        401: `The currently authenticated user has insufficient permissions to administrate the specified repository.`,
        404: `The specified repository does not exist.`,
      },
    });
  }
  /**
   * Find webhooks
   * Find webhooks in this project.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for the specified project to call this resource.
   * @param projectKey The project key.
   * @param event List of <code>com.atlassian.webhooks.WebhookEvent</code> IDs to filter for
   * @param statistics <code>true</code> if statistics should be provided for all found webhooks
   * @returns any A page of webhooks.
   * @throws ApiError
   */
  public static findWebhooks(
    projectKey: string,
    event?: string,
    statistics?: boolean,
  ): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}/webhooks',
      path: {
        'projectKey': projectKey,
      },
      query: {
        'event': event,
        'statistics': statistics,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to find webhooks in the project.`,
        404: `The specified project does not exist.`,
      },
    });
  }
  /**
   * Create webhook
   * Create a webhook for the project specified via the URL.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for the specified project to call this resource.
   * @param projectKey The project key.
   * @param requestBody The webhook to be created for this project.
   * @returns RestWebhook A created webhook.
   * @throws ApiError
   */
  public static createWebhook(
    projectKey: string,
    requestBody?: RestWebhook,
  ): CancelablePromise<RestWebhook> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/latest/projects/{projectKey}/webhooks',
      path: {
        'projectKey': projectKey,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `The webhook parameters were invalid or not supplied.`,
        401: `The currently authenticated user has insufficient permissions to create webhooks in the project.`,
        404: `The project does not exist.`,
      },
    });
  }
  /**
   * Test webhook
   * Test connectivity to a specific endpoint.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for the specified project to call this resource.
   * @param projectKey The project key.
   * @param webhookId
   * @param sslVerificationRequired
   * @param url The url in which to connect to
   * @param requestBody Basic authentication credentials, if required.
   * @returns RestWebhookRequestResponse A webhook.
   * @throws ApiError
   */
  public static testWebhook(
    projectKey: string,
    webhookId?: number,
    sslVerificationRequired: boolean = true,
    url?: string,
    requestBody?: RestWebhookCredentials,
  ): CancelablePromise<RestWebhookRequestResponse> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/latest/projects/{projectKey}/webhooks/test',
      path: {
        'projectKey': projectKey,
      },
      query: {
        'webhookId': webhookId,
        'sslVerificationRequired': sslVerificationRequired,
        'url': url,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        401: `The currently authenticated user has insufficient permissions to test a connection.`,
        404: `The specified project does not exist.`,
      },
    });
  }
  /**
   * Delete webhook
   * Delete a webhook for the project specified via the URL.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for the specified project to call this resource.
   * @param projectKey The project key.
   * @param webhookId The ID of the webhook to be deleted.
   * @returns void
   * @throws ApiError
   */
  public static deleteWebhook(
    projectKey: string,
    webhookId: string,
  ): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/latest/projects/{projectKey}/webhooks/{webhookId}',
      path: {
        'projectKey': projectKey,
        'webhookId': webhookId,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to delete webhooks in the project.`,
        404: `The specified project does not exist, or webhook does not exist in this project.`,
      },
    });
  }
  /**
   * Get webhook
   * Get a webhook by ID.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for the specified project to call this resource.
   * @param projectKey The project key.
   * @param webhookId ID of the webhook
   * @param statistics <code>true</code> if statistics should be provided for the webhook
   * @returns RestWebhook A webhook.
   * @throws ApiError
   */
  public static getWebhook(
    projectKey: string,
    webhookId: string,
    statistics?: string,
  ): CancelablePromise<RestWebhook> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}/webhooks/{webhookId}',
      path: {
        'projectKey': projectKey,
        'webhookId': webhookId,
      },
      query: {
        'statistics': statistics,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to get a webhook in the project.`,
        404: `The project does not exist, or the webhook does not exist in the project.`,
      },
    });
  }
  /**
   * Update webhook
   * Update an existing webhook.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for the specified project to call this resource.
   * @param projectKey The project key.
   * @param webhookId Id of the existing webhook
   * @param requestBody The representation of the updated values for the webhook
   * @returns RestWebhook A webhook.
   * @throws ApiError
   */
  public static updateWebhook(
    projectKey: string,
    webhookId: string,
    requestBody?: RestWebhook,
  ): CancelablePromise<RestWebhook> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/latest/projects/{projectKey}/webhooks/{webhookId}',
      path: {
        'projectKey': projectKey,
        'webhookId': webhookId,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        401: `The currently authenticated user has insufficient permissions to update a webhook in this project.`,
        404: `The project does not exist, or the webhook does not exist in the project.`,
      },
    });
  }
  /**
   * Get last webhook invocation details
   * Get the latest invocations for a specific webhook.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for the specified project to call this resource.
   * @param projectKey The project key.
   * @param webhookId ID of the webhook
   * @param event The string ID of a specific event to retrieve the last invocation for.
   * @param outcome The outcome to filter for. Can be SUCCESS, FAILURE, ERROR. None specified means that the all will be considered
   * @returns RestDetailedInvocation A webhook invocation dataset.
   * @throws ApiError
   */
  public static getLatestInvocation(
    projectKey: string,
    webhookId: string,
    event?: string,
    outcome?: string,
  ): CancelablePromise<RestDetailedInvocation> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}/webhooks/{webhookId}/latest',
      path: {
        'projectKey': projectKey,
        'webhookId': webhookId,
      },
      query: {
        'event': event,
        'outcome': outcome,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to get webhook invocations in the project.`,
        404: `The specified project does not exist, or the webhook does not exist in the project.`,
      },
    });
  }
  /**
   * Get webhook statistics
   * Get the statistics for a specific webhook.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for the specified project to call this resource.
   * @param projectKey The project key.
   * @param webhookId ID of the webhook
   * @param event The string ID of a specific event to retrieve the last invocation for. May be empty, in which case all events are considered
   * @returns RestInvocationHistory A webhook invocation dataset.
   * @throws ApiError
   */
  public static getStatistics(
    projectKey: string,
    webhookId: string,
    event?: string,
  ): CancelablePromise<RestInvocationHistory> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}/webhooks/{webhookId}/statistics',
      path: {
        'projectKey': projectKey,
        'webhookId': webhookId,
      },
      query: {
        'event': event,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to get webhook statistics in the project.`,
        404: `The specified project does not exist, or the webhook does not exist in the project.`,
      },
    });
  }
  /**
   * Get webhook statistics summary
   * Get the statistics summary for a specific webhook.
   *
   * The authenticated user must have <strong>PROJECT_ADMIN</strong> permission for the specified project to call this resource.
   * @param projectKey The project key.
   * @param webhookId ID of the webhook
   * @returns RestInvocationHistory A webhook invocation dataset.
   * @throws ApiError
   */
  public static getStatisticsSummary(
    projectKey: string,
    webhookId: string,
  ): CancelablePromise<RestInvocationHistory> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/projects/{projectKey}/webhooks/{webhookId}/statistics/summary',
      path: {
        'projectKey': projectKey,
        'webhookId': webhookId,
      },
      errors: {
        401: `The currently authenticated user has insufficient permissions to get webhook statistics summary in the project.`,
        404: `The project does not exist, or the webhook does not exist in the project.`,
      },
    });
  }
}


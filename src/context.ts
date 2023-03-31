import * as github from "@actions/github";
import * as core from "@actions/core";
import {PullRequest, WorkflowRun} from "@octokit/webhooks-types";

export function getCheckRunSha(): string {
    if(github.context.eventName === "workflow_run"){
        core.info("Action triggered by workflow run");
        const event = github.context.payload;
        if(!event.workflow_run){
            throw new Error("Event 'workflow_run' is missing field 'workflow_run'");
        }
        return (event.workflow_run as WorkflowRun).head_commit.id;
    }

    if(github.context.eventName === "pull_request"){
        core.info("Action triggered by pull request");
        const event = github.context.payload;
        if(!event.pull_request){
            throw new Error("Event 'pull_request' is missing field 'pull_request'");
        }
        return (event.pull_request as PullRequest).head.sha;
    }

    return github.context.sha;
}
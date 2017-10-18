"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var utils_1 = require("../shared/utils");
var functions_1 = require("../shared/functions");
var github_1 = require("../shared/github");
module.exports = function (context) {
    var githubApiHeaders = {
        'User-Agent': 'github-bot-uwp-toolkit',
        'Authorization': 'token ' + process.env.GITHUB_BOT_UWP_TOOLKIT_ACCESS_TOKEN
    };
    github_1.getAllMilestones(githubApiHeaders, process.env.GITHUB_BOT_UWP_TOOLKIT_REPO_OWNER, process.env.GITHUB_BOT_UWP_TOOLKIT_REPO_NAME, function (milestones) {
        var currentMilestone = milestones
            .filter(function (m) { return m.state === 'OPEN' && !!m.dueOn; })
            .sort(function (m1, m2) { return new Date(m1.dueOn).getTime() - new Date(m2.dueOn).getTime(); })[0];
        github_1.getAllGitHubIssuesRecursively(githubApiHeaders, process.env.GITHUB_BOT_UWP_TOOLKIT_REPO_OWNER, process.env.GITHUB_BOT_UWP_TOOLKIT_REPO_NAME, null, function (issues) {
            var exclusiveLabels = [
                'PR in progress',
                'work in progress',
                'help wanted',
                'uservoice-entry-created',
                'mute-bot'
            ];
            var issuesToCheck = issues
                .filter(function (issue) {
                return (!issue.milestone || issue.milestone.number <= currentMilestone.number);
            })
                .filter(function (issue) {
                return !isIssueContainsExclusiveLabels(issue, exclusiveLabels);
            });
            var issuesWithoutActivity = issuesToCheck.filter(function (issue) {
                return detectIssueWithoutActivity(issue);
            });
            var decisions = issuesWithoutActivity.map(function (issue) {
                var numberOfAlertsAlreadySent = detectNumberOfAlertsAlreadySent(process.env.GITHUB_BOT_UWP_TOOLKIT_USERNAME, issue);
                if (numberOfAlertsAlreadySent === 2) {
                    return {
                        issue: issue,
                        numberOfAlertsAlreadySent: numberOfAlertsAlreadySent,
                        decision: 'close'
                    };
                }
                else {
                    return {
                        issue: issue,
                        numberOfAlertsAlreadySent: numberOfAlertsAlreadySent,
                        decision: 'alert'
                    };
                }
            });
            if (process.env.GITHUB_BOT_UWP_TOOLKIT_ACTIVATE_MUTATION) {
                decisions.filter(function (d) { return d.decision === 'alert'; }).forEach(function (d) {
                    var numberOfDaysWithoutActivity = parseInt(process.env.NUMBER_OF_DAYS_WITHOUT_ACTIVITY || '7');
                    var daysBeforeClosingIssue = numberOfDaysWithoutActivity * (2 - d.numberOfAlertsAlreadySent);
                    github_1.commentGitHubIssue(githubApiHeaders, d.issue.id, "This issue seems inactive. It will automatically be closed in " + daysBeforeClosingIssue + " days if there is no activity.");
                });
                decisions.filter(function (d) { return d.decision === 'close'; }).forEach(function (d) {
                    github_1.commentGitHubIssue(githubApiHeaders, d.issue.id, 'Issue is inactive. It was automatically closed.');
                    github_1.closeGitHubIssue(githubApiHeaders, process.env.GITHUB_BOT_UWP_TOOLKIT_REPO_OWNER, process.env.GITHUB_BOT_UWP_TOOLKIT_REPO_NAME, d.issue.number, d.issue.id);
                });
            }
            context.log(decisions);
            functions_1.completeFunction(context, null, { status: 201, body: decisions });
        });
    });
};
var detectNumberOfAlertsAlreadySent = function (botUsername, issue) {
    var lastTwoMessages = issue.lastTwoComments.edges.map(function (edge) { return edge.node; });
    var numberOfAlertsAlreadySent = 0;
    for (var i = lastTwoMessages.length - 1; i >= 0; i--) {
        var message = lastTwoMessages[i];
        if (message.author.login === botUsername && message.body.indexOf('This issue seems inactive') > -1) {
            numberOfAlertsAlreadySent++;
        }
        else {
            break;
        }
    }
    return numberOfAlertsAlreadySent;
};
var detectIssueWithoutActivity = function (issue) {
    var loginsOfAuthors = utils_1.distinct(issue.commentAuthors.edges.map(function (edge) { return edge.node.author.login; }));
    var issueHasResponse = utils_1.distinct(loginsOfAuthors.filter(function (c) { return c !== issue.author.login; })).length > 0;
    if (issueHasResponse) {
        var lastComment = issue.lastComment.edges[0];
        var today = new Date();
        var numberOfDaysWithoutActivity = parseInt(process.env.NUMBER_OF_DAYS_WITHOUT_ACTIVITY || '7');
        if (lastComment && new Date(lastComment.node.updatedAt) < utils_1.addDays(today, -numberOfDaysWithoutActivity)) {
            return true;
        }
    }
    return false;
};
var isIssueContainsExclusiveLabels = function (issue, exclusiveLabels) {
    return issue.labels.edges
        .map(function (edge) { return edge.node; })
        .some(function (label) {
        return exclusiveLabels.some(function (l) { return l === label.name; });
    });
};
//# sourceMappingURL=index.js.map
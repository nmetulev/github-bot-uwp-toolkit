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
    github_1.getAllGitHubIssuesRecursively(githubApiHeaders, process.env.GITHUB_BOT_UWP_TOOLKIT_REPO_OWNER, process.env.GITHUB_BOT_UWP_TOOLKIT_REPO_NAME, null, function (issues) {
        var exclusiveLabels = [
            'PR in progress',
            'work in progress',
            'help wanted',
            'uservoice-entry-created',
            'mute-bot'
        ];
        var contributorsToAlert = [
            'nmetulev',
            'Odonno',
            'IbraheemOsama'
        ];
        var issuesWithoutResponse = issues.filter(function (issue) {
            return detectIfNoResponseFromCommunity(issue, exclusiveLabels);
        });
        if (process.env.GITHUB_BOT_UWP_TOOLKIT_ACTIVATE_MUTATION) {
            var pingContributorsMessagePart_1 = contributorsToAlert.map(function (c) { return '@' + c; }).join(' ');
            issuesWithoutResponse.forEach(function (issue) {
                github_1.commentGitHubIssue(githubApiHeaders, issue.id, "No response from the community. ping " + pingContributorsMessagePart_1);
            });
        }
        context.log(issuesWithoutResponse);
        functions_1.completeFunctionBySendingMail(context, [{ "to": [{ "email": "nmetulev@microsoft.com" }] }], { email: "sender@contoso.com" }, "No Response From Community On Issues", [{
                type: 'text/plain',
                value: JSON.stringify(issuesWithoutResponse)
            }]);
    });
};
var detectIfNoResponseFromCommunity = function (issue, exclusiveLabels) {
    var loginsOfAuthors = utils_1.distinct(issue.commentAuthors.edges.map(function (edge) { return edge.node.author.login; }));
    var issueHasNoResponse = utils_1.distinct(loginsOfAuthors.filter(function (c) { return c !== issue.author.login; })).length === 0;
    if (issueHasNoResponse) {
        var containsExclusiveLabels = issue.labels.edges
            .map(function (edge) { return edge.node; })
            .some(function (label) {
            return exclusiveLabels.some(function (l) { return l === label.name; });
        });
        if (!containsExclusiveLabels) {
            var today = new Date();
            var numberOfDaysWithoutResponse = parseInt(process.env.NUMBER_OF_DAYS_WITHOUT_RESPONSE || '7');
            if (new Date(issue.createdAt) < utils_1.addDays(today, -numberOfDaysWithoutResponse)) {
                return true;
            }
        }
    }
    return false;
};
//# sourceMappingURL=index.js.map
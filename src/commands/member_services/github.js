const Discord = require('discord.js');
const Command = require('../Command');
const { prefix } = require('../../../config.json');
const { GithubMessageGenerator } = require('../../util/GithubMessageGenerator');

/**
 * commands that grabs Github data from SCE server
 * pr <repoName> -> Open Pull Requests
 * leaderboard <repoName> -> Top 5 contributors
 * commits <repoName> <numOfCommits> -> Merged Commits
 */
module.exports = new Command({
  name: 'github',
  description: 'Displays following information from SCE github repos:\
  Contributor leaderboard, Pull requests, merged commits',
  aliases: ['git'],
  example: `${prefix}git <pr | leaderboard | commits> <repo>`,
  permissions: 'general',
  category: 'github',
  execute: (message, args) => {
    const messageGenerator = new GithubMessageGenerator();

    switch (args[0]) {
      case 'pr':
        messageGenerator.generatePullRequestMessage(args[1])
          .then(prMessage => {
            if (prMessage.length === 0) {
              message.channel.send(`${args[1]} has no pull requests.`);
              return;
            }

            let pageIndex = 0;

            const prEmbed = new Discord.RichEmbed()
              .setColor('28C7E6')
              .setThumbnail('https://github.githubassets.com' +
              '/images/modules/logos_page/Octocat.png')
              .setFooter(`Page ${pageIndex + 1} of ${prMessage.length}`);

            prMessage[pageIndex].forEach((pr) => {
              prEmbed.addField(pr.name, pr.value);
            });

            message.channel.send(prEmbed).then(async sentEmbed => {
              await sentEmbed.react('⬅️');
              await sentEmbed.react('➡️');
            
              const filter = (reaction, user) => {
                return ['⬅️', '➡️'].includes(reaction.emoji.name) 
                  && user.id === message.author.id;
              };

              // Listens to reactions for 1 minute
              const collector =
                sentEmbed.createReactionCollector(filter, { time: 60000 });
              collector.on('collect', reaction => {
                reaction.remove(reaction.users.last().id);
                switch(reaction.emoji.name) {
                  case '⬅️':
                    if (pageIndex === 0) return;
                    pageIndex--;
                    break;
                  case '➡️':
                    if (pageIndex === prMessage.length - 1) {
                      pageIndex = 0;
                    } else {
                      pageIndex++;
                    }
                }
                const newPrEmbed = new Discord.RichEmbed()
                  .setColor('28C7E6')
                  .setThumbnail('https://github.githubassets.com' +
                  '/images/modules/logos_page/Octocat.png')
                  .setFooter(`Page ${pageIndex + 1} of ${prMessage.length}`);

                prMessage[pageIndex].forEach((pr) => {
                  newPrEmbed.addField(pr.name, pr.value);
                });
                
                sentEmbed.edit(newPrEmbed);
              });
            });
          })
          .catch(() => {
            message.channel.send(
              'Oops! There was an error fetching your request.'
            );
          });
        break;

      case 'leaderboard':
        messageGenerator.generateLeaderboardMessage(args[1])
          .then(leaderboardMessage => {
            if (leaderboardMessage.length === 0) {
              message.channel.send(
                `${args[1]} has no leaderboard yet. Get coding!`
              );
              return;
            }

            const leaderboardEmbed = new Discord.RichEmbed()
              .setColor('#ccffff');
            leaderboardMessage.forEach(embed => {
              let name = embed.author.name;
              let commits = embed.description;
              leaderboardEmbed.addField(name, commits);
            });
            message.channel.send(leaderboardEmbed);
          })
          .catch(() => {
            message.channel.send(
              'Oops! There was an error fetching your request.'
            );
          });
        break;

      case 'commits':
        // Check if 3rd argument (optional) is a number
        if (args[2] && isNaN(args[2])) {
          message.channel.send(
            `Invalid Value: ${args[2]} Please enter a number`
          );
          break;
        }
        messageGenerator.generateCommitMessage(args[1], args[2])
          .then(commitMessage => {
            if (commitMessage.length === 0) {
              message.channel.send(
                `Not much happening: ${args[1]} has no merged commits.`
              );
              return;
            }
            message.channel.send(commitMessage);
          })
          .catch(() => {
            message.channel.send(
              'Oops! There was an error fetching your request.'
            );
          });
        break;

      default:
        // Help
        message.channel.send(
          new Discord.RichEmbed()
            .setDescription('Unrecognized parameter try using:')
            .addField(`\`${prefix}git pr <repo>\``, 'View pull requests')
            .addField(
              `\`${prefix}git leaderboard <repo>\``,
              'Top 5 contributors'
            )
            .addField(
              `\`${prefix}git commits <repo> [num]\``,
              'Merged commits - `[num]` (optional, Limit: 25)'
            )
        );
    }
  },
});


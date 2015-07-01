import Bot from 'keybase-bot';
import * as path from 'path';
import {get} from 'lodash';
import * as core from '@actions/core';

export default class Keybase {
  bot: Bot;
  keybaseBinary: string;
  username: string;
  paperKey: string;

  constructor(username, paperKey) {
    this.bot = new Bot();
    this.keybaseBinary = path.join(__dirname, 'keybase');
    core.debug(`Keybase binary location: ${this.keybaseBinary}`);
    this.username = username;
    this.paperKey = paperKey;
  }

  public async init() {
    await this.bot.init(this.username, this.paperKey, {
      verbose: false,
      botLite: true,
      disableTyping: true,
      keybaseBinaryLocation: this.keybaseBinary,
    });
  }

  public async deinit() {
    await this.bot.deinit();
  }

  public async sendChatMessage(args) {
    const channel = {
      public: false,
      topicType: 'chat',
      name: '',
      membersType: '',
      topicName: '',
    };
    if (args.teamInfo.channel) {
      channel['name'] = args.teamInfo.channel;
    } else {
      channel['name'] = args.teamInfo.teamName;
      channel['membersType'] = 'team';
      channel['topicName'] = args.teamInfo.topicName;
    }

    await this.bot.chat.send(channel, {body: args.message});
  }

  public async getKeybaseUsername(githubUsername) {
    let keybaseUsername = '';
    if (!githubUsername) {
      return keybaseUsername;
    }

    try {
      const res = await this.bot.helpers.rawApiCall({
        endpoint: 'user/lookup',
        arg: {
          github: githubUsername,
          fields: 'basics',
        },
      });
      keybaseUsername = get(res, 'them[0].basics.username', '');
      core.debug(`Username lookup successful, found ${keybaseUsername}`);
    } catch (error) {
      core.info(`User ${githubUsername} not found: ${error.message}`);
    }

    return keybaseUsername;
  }
}

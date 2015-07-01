/* eslint-disable @typescript-eslint/no-var-requires */

import * as process from 'process';
import * as path from 'path';

describe('main handler', () => {
  let mockKeybase;
  let mockKeybaseMethods;
  let mockUtils;

  beforeEach(() => {
    jest.resetModules();

    process.env['INPUT_KEYBASE_USERNAME'] = 'fakebob';
    process.env['INPUT_KEYBASE_PAPER_KEY'] = 'this is a fake paper key';
    process.env['INPUT_KEYBASE_CHANNEL'] = 'funtimes';
    delete process.env['INPUT_MESSAGE'];

    process.env['GITHUB_EVENT_NAME'] = 'push';
    process.env['GITHUB_SHA'] = 'f6f40d9fbd1130f7f2357bb54225567dbd7a3793';
    process.env['GITHUB_REF'] = 'refs/heads/automatic-pre-releaser';
    process.env['GITHUB_WORKFLOW'] = 'keybase';
    process.env['GITHUB_ACTION'] = 'self';
    process.env['GITHUB_ACTOR'] = 'marvinpinto';
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'force-push.json');
    process.env['GITHUB_REPOSITORY'] = 'marvinpinto/private-actions-tester';

    mockKeybaseMethods = {
      init: jest.fn(() => Promise.resolve()),
      deinit: jest.fn(() => Promise.resolve()),
      sendChatMessage: jest.fn(() => Promise.resolve()),
      getKeybaseUsername: jest.fn(() => ''),
    };
    mockKeybase = jest.fn().mockImplementation(() => {
      return mockKeybaseMethods;
    });
    jest.mock('../src/keybase', () => {
      return mockKeybase;
    });

    mockUtils = {
      getShortenedUrl: jest.fn(() => Promise.resolve('https://example.com')),
      dumpGitHubEventPayload: jest.fn(),
    };
    jest.mock('../src/utils', () => {
      return mockUtils;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws an error when "keybase_username" is not supplied', async () => {
    delete process.env.INPUT_KEYBASE_USERNAME;
    const inst = require('../src/main');
    await expect(inst.main()).rejects.toThrow('Input required and not supplied: keybase_username');
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(0);
  });

  it('throws an error when "keybase_password" is not supplied', async () => {
    delete process.env.INPUT_KEYBASE_PAPER_KEY;
    const inst = require('../src/main');
    await expect(inst.main()).rejects.toThrow('Input required and not supplied: keybase_paper_key');
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(0);
  });

  it('does not throw an error when "keybase_channel" is not supplied', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'force-push.json');
    delete process.env.INPUT_KEYBASE_CHANNEL;
    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybase).toHaveBeenCalledTimes(1);
    expect(mockKeybase).toHaveBeenCalledWith('fakebob', 'this is a fake paper key');
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
  });

  it('does not throw an error when it encounters an unsupported GitHub event', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'invalid.json');
    delete process.env.GITHUB_EVENT_NAME;
    const inst = require('../src/main');
    await inst.main();
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(0);
  });

  it('is able to process force-push events', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'force-push.json');
    process.env['GITHUB_EVENT_NAME'] = 'push';

    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybase).toHaveBeenCalledTimes(1);
    expect(mockKeybase).toHaveBeenCalledWith('fakebob', 'this is a fake paper key');
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledWith({
      teamInfo: {channel: 'funtimes', teamName: '', topicName: ''},
      message:
        'GitHub user `marvinpinto` *force-pushed* 1 commit(s) to `refs/heads/master` - https://example.com\n> _repo: marvinpinto/keybase-notifications-action_\n> - Run the generated action locally on specific events',
    });
  });

  it('is able to process repo-starring events', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'repo-starring.json');
    process.env['GITHUB_EVENT_NAME'] = 'watch';

    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledWith({
      teamInfo: {channel: 'funtimes', teamName: '', topicName: ''},
      message: 'Repository `marvinpinto/keybase-notifications-action` starred by `marvinpinto` :+1: :star:',
    });
  });

  it('is able to process push events', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'push.json');
    process.env['GITHUB_EVENT_NAME'] = 'push';

    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledWith({
      teamInfo: {channel: 'funtimes', teamName: '', topicName: ''},
      message:
        'GitHub user `marvinpinto` *pushed* 2 commit(s) to `refs/heads/master` - https://example.com\n> _repo: marvinpinto/keybase-notifications-action_\n> - Add the functionality to deal with GitHub repo-starring events\n> - Make up a fake commit for testing',
    });
  });

  it('is able to correctly display keybase usernames for push events', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'push.json');
    process.env['GITHUB_EVENT_NAME'] = 'push';
    mockKeybaseMethods.getKeybaseUsername = jest.fn(() => 'keybasebob');

    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledWith({
      teamInfo: {channel: 'funtimes', teamName: '', topicName: ''},
      message:
        'User @keybasebob *pushed* 2 commit(s) to `refs/heads/master` - https://example.com\n> _repo: marvinpinto/keybase-notifications-action_\n> - Add the functionality to deal with GitHub repo-starring events\n> - Make up a fake commit for testing',
    });
  });

  it('is able to correctly display keybase usernames for repo-starring events', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'repo-starring.json');
    process.env['GITHUB_EVENT_NAME'] = 'watch';
    mockKeybaseMethods.getKeybaseUsername = jest.fn(() => 'keybasebob');

    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledWith({
      teamInfo: {channel: 'funtimes', teamName: '', topicName: ''},
      message: 'Repository `marvinpinto/keybase-notifications-action` starred by @keybasebob :+1: :star:',
    });
  });

  it('is able to process a pull_request updated event', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'pull-request-synchronize.json');
    process.env['GITHUB_EVENT_NAME'] = 'pull_request';

    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledWith({
      teamInfo: {channel: 'funtimes', teamName: '', topicName: ''},
      message:
        'PR #2 *updated* by GitHub user `marvinpinto` - https://example.com\n> _repo: marvinpinto/actions_\n> Title: *test: update for only pr events*\n> Need this for testing. Will probably remove later.',
    });
  });

  it('is able to process a pull_request closed event', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'pull-request-closed.json');
    process.env['GITHUB_EVENT_NAME'] = 'pull_request';

    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledWith({
      teamInfo: {channel: 'funtimes', teamName: '', topicName: ''},
      message:
        'PR #3 *closed* by GitHub user `marvinpinto` - https://example.com\n> _repo: marvinpinto/actions_\n> Title: *Pull request*',
    });
  });

  it('is able to process a pull_request reopened event', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'pull-request-reopened.json');
    process.env['GITHUB_EVENT_NAME'] = 'pull_request';

    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledWith({
      teamInfo: {channel: 'funtimes', teamName: '', topicName: ''},
      message:
        'PR #2 *reopened* by GitHub user `marvinpinto` - https://example.com\n> _repo: marvinpinto/actions_\n> Title: *test: update for only pr events*\n> Need this for testing. Will probably remove later.',
    });
  });

  it('is able to process a pull_request merged event', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'pull-request-merged.json');
    process.env['GITHUB_EVENT_NAME'] = 'pull_request';

    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledWith({
      teamInfo: {channel: 'funtimes', teamName: '', topicName: ''},
      message:
        'PR #3 *merged* by GitHub user `marvinpinto` - https://example.com\n> _repo: marvinpinto/actions_\n> Title: *Pull request*',
    });
  });

  it('is able to process a pull_request opened event', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'pull-request-opened.json');
    process.env['GITHUB_EVENT_NAME'] = 'pull_request';
    mockKeybaseMethods.getKeybaseUsername = jest.fn(() => 'keybasebob');

    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledWith({
      teamInfo: {channel: 'funtimes', teamName: '', topicName: ''},
      message:
        'PR #4 *opened* by @keybasebob - https://example.com\n> _repo: marvinpinto/actions_\n> Title: *Pull request*',
    });
  });

  it('is able to process a commit_comment event', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'commit-comment.json');
    process.env['GITHUB_EVENT_NAME'] = 'commit_comment';
    mockKeybaseMethods.getKeybaseUsername = jest.fn(() => 'keybasebob');

    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledWith({
      teamInfo: {channel: 'funtimes', teamName: '', topicName: ''},
      message:
        'New comment on `marvinpinto/actions@dea24cc` by @keybasebob - https://example.com\n> This is a test commit comment!',
    });
  });

  it('is able to process a new issue event', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'issue-new.json');
    process.env['GITHUB_EVENT_NAME'] = 'issues';

    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledWith({
      teamInfo: {channel: 'funtimes', teamName: '', topicName: ''},
      message:
        'Issue #6 *opened* by GitHub user `marvinpinto` - https://example.com\n> _repo: marvinpinto/actions_\n> Title: *This is a test issue*',
    });
  });

  it('is able to process an updated issue event', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'issue-updated.json');
    process.env['GITHUB_EVENT_NAME'] = 'issues';

    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledWith({
      teamInfo: {channel: 'funtimes', teamName: '', topicName: ''},
      message:
        'Issue #6 *updated* by GitHub user `marvinpinto` - https://example.com\n> _repo: marvinpinto/actions_\n> Title: *This is a test issue with updates*',
    });
  });

  it('is able to process a closed issue event', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'issue-closed.json');
    process.env['GITHUB_EVENT_NAME'] = 'issues';

    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledWith({
      teamInfo: {channel: 'funtimes', teamName: '', topicName: ''},
      message:
        'Issue #6 *closed* by GitHub user `marvinpinto` - https://example.com\n> _repo: marvinpinto/actions_\n> Title: *This is a test issue with updates*',
    });
  });

  it('is able to process a reopened issue event', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'issue-reopened.json');
    process.env['GITHUB_EVENT_NAME'] = 'issues';
    mockKeybaseMethods.getKeybaseUsername = jest.fn(() => 'keybasebob');

    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledWith({
      teamInfo: {channel: 'funtimes', teamName: '', topicName: ''},
      message:
        'Issue #6 *reopened* by @keybasebob - https://example.com\n> _repo: marvinpinto/actions_\n> Title: *This is a test issue with updates*',
    });
  });

  it('is able to process a new issue comment event', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'issue-comment-created.json');
    process.env['GITHUB_EVENT_NAME'] = 'issue_comment';
    mockKeybaseMethods.getKeybaseUsername = jest.fn(() => 'keybasebob');

    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledWith({
      teamInfo: {channel: 'funtimes', teamName: '', topicName: ''},
      message:
        '*New* comment on Issue #6 from @keybasebob. https://example.com\n> _repo: marvinpinto/actions_\n> This is a test issue comment.',
    });
  });

  it('is able to process an updated issue comment event', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'issue-comment-edited.json');
    process.env['GITHUB_EVENT_NAME'] = 'issue_comment';

    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledWith({
      teamInfo: {channel: 'funtimes', teamName: '', topicName: ''},
      message:
        '*Updated* comment on Issue #6 from GitHub user `marvinpinto`. https://example.com\n> _repo: marvinpinto/actions_\n> This is an edited issue comment.',
    });
  });

  it('is able to process a deleted issue comment event', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'issue-comment-deleted.json');
    process.env['GITHUB_EVENT_NAME'] = 'issue_comment';

    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledWith({
      teamInfo: {channel: 'funtimes', teamName: '', topicName: ''},
      message:
        '*Deleted* comment on Issue #6 by GitHub user `marvinpinto`. https://example.com\n> _repo: marvinpinto/actions_\n> This is an edited issue comment.',
    });
  });

  it('is able to send out custom keybase notification messages', async () => {
    process.env['INPUT_MESSAGE'] = 'Hey there, world!';
    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledWith({
      teamInfo: {channel: 'funtimes', teamName: '', topicName: ''},
      message: 'Hey there, world!',
    });
  });

  it('is able to ignore merge commits', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'push-with-merge-commits.json');
    process.env['GITHUB_EVENT_NAME'] = 'push';

    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybase).toHaveBeenCalledTimes(1);
    expect(mockKeybase).toHaveBeenCalledWith('fakebob', 'this is a fake paper key');
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledWith({
      teamInfo: {channel: 'funtimes', teamName: '', topicName: ''},
      message:
        'GitHub user `marvinpinto` *pushed* 2 commit(s) to `refs/heads/master` - https://example.com\n> _repo: marvinpinto/private-actions-tester_\n> - feat: add the ability to send custom keybase notification messages',
    });
  });
});

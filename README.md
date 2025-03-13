<div align="center">

# Mattermost Channel Translations Plugin [![Download Latest Master Build](https://img.shields.io/badge/Download-Latest%20Master%20Build-blue)](https://github.com/mattermost/mattermost-plugin-channel-translations/releases/tag/latest-master)

The Mattermost Channel Translations Plugin enables automatic translation of messages in channels of your choice, allowing teams to communicate effectively across language barriers in [Mattermost](https://github.com/mattermost/mattermost).

</div>

## Features

- **Channel-Specific Translations** - Enable translations selectively in specific channels
- **Multiple Language Support** - Configure multiple target languages for translation
- **Seamless Integration** - Translations are displayed inline with original messages
- **User Language Preferences** - Users can select their preferred translation language

## Installation

1. Download the latest release from the [releases page](https://github.com/mattermost/mattermost-plugin-channel-translations/releases)
2. Upload and enable the plugin through the Mattermost System Console
3. Configure your desired translation settings

### System Requirements

- Mattermost Server versions:
  - v10.0 or later recommended
  - v9.11+ (ESR)
- PostgreSQL database
- Network access to the translation service

## Configuration

After installation, you'll need to configure the plugin through the System Console:

1. Navigate to **System Console > Plugins > Channel Translations**
2. Enable translations globally
3. Configure the translation languages (comma-separated language codes, e.g., "en,es,fr,de")
4. Configure the translation bot name if needed
5. Save your settings

### Enabling Channel Translations

Any user with the appropriate channel management permissions can enable translations:

1. Go to a channel where you want to enable translations
2. Click the channel header menu dropdown
3. Select "Enable Translations"

### User Settings

Users can set their preferred translation language in their account settings:

1. Go to Account Settings > Channel Translations
2. Select your preferred language from the dropdown
3. Save your settings

## Development

### Prerequisites

- Go 1.22+
- Node.js 20.11+
- Access to a translation service

### Local Setup

1. Setup your Mattermost development environment by following the [Mattermost developer setup guide](https://developers.mattermost.com/contribute/server/developer-setup/). If you have a remote mattermost server you want to develop to you can skip this step. 

2. Setup your Mattermost plugin development environment by following the [Plugin Developer setup guide](https://developers.mattermost.com/integrate/plugins/developer-setup/).

3. Clone the repository:
```bash
git clone https://github.com/mattermost/mattermost-plugin-channel-translations.git
cd mattermost-plugin-channel-translations
```

4. **Optional**. If you are developing to a remote server, setup environment variables to deploy:
```bash
MM_SERVICESETTINGS_SITEURL=http://localhost:8065
MM_ADMIN_USERNAME=<YOUR_USERNAME>
MM_ADMIN_PASSWORD=<YOUR_PASSWORD>
```

5. Run deploy to build the plugin
```bash
make deploy
```

### Other make commands

- Run `make help` for a list of all make commands
- Run `make check-style` to verify code style
- Run `make test` to run the test suite
- Run `make e2e` to run the e2e tests

## License

This repository is licensed under [Apache-2](./LICENSE), except for the [server/enterprise](server/enterprise) directory which is licensed under the [Mattermost Source Available License](LICENSE.enterprise). See [Mattermost Source Available License](https://docs.mattermost.com/overview/faq.html#mattermost-source-available-license) to learn more.

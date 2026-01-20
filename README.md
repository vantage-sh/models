# models.vantage.sh

[![uses cloudflare](https://img.shields.io/badge/uses-Cloudflare-orange)](https://cloudflare.com)
[![Built with Astro](https://img.shields.io/badge/Built%20with-Astro-ff5d01.svg)](https://astro.build/)

![Vantage Picture](https://uploads-ssl.webflow.com/5f9ba05ba40d6414f341df34/5f9bb1764b6670c6f7739564_moutain-scene.svg)

> Comparing AI model pricing and benchmarks across cloud vendors shouldn't require dozens of browser tabs.

Models.vantage.sh displays AI model pricing, benchmarks, and metadata from various cloud vendors in a single, queryable interface. Built with Astro, React, and Tailwind CSS, it features a client-side SQL engine (sql.js) for querying model data.

## Project status

Vantage employees are actively maintaining and hosting the site with the help of contributors here. Improvements in the form of pull requests or ideas via issues are welcome!

We also have a [Slack Community](https://vantage.sh/slack) for anyone to join.

## Requirements

- Node.js 24+

## Developing locally

First, install dependencies:

```sh
npm install
```

You then need to either:

- [Scrape the data locally](#scraping-the-data) to generate `public/data.json`
- Or obtain a pre-built `data.json` from CI artifacts if you aren't modifying the scraper

Once you have the data, start the development server:

```sh
npm run dev
```

This starts the local dev server at `localhost:4321`.

Before making a pull request, run the type checker and formatter:

```sh
npm run typecheck
npm run format:check
```

### Scraping the data

You'll need to provide credentials so that the scrapers can access AWS APIs. Options for setting this up are described in the [AWS SDK docs](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html).

Once credentials are configured, run:

```sh
npm run init
```

This executes the scrapers in `scraper/` and outputs model data to `public/data.json`.

### Adding new vendors

1. Create a new scraper in `scraper/scrapers/`
2. Add the scraper call to `scraper/runner.ts`
3. Update the `PROVIDERS` map as needed
4. Update `MODEL_REASONING_PREFIXES` and `isSelfHostableModel()` in `scraper/constants.ts` for new model families

## Commands

All commands are run from the root of the project:

| Command              | Action                                        |
| :------------------- | :-------------------------------------------- |
| `npm install`        | Install dependencies                          |
| `npm run dev`        | Start local dev server at `localhost:4321`    |
| `npm run build`      | Build for production to `./dist/`             |
| `npm run preview`    | Preview the production build locally          |
| `npm run init`       | Run scrapers to generate `public/data.json`   |
| `npm run typecheck`  | Run TypeScript type checking                  |
| `npm run format`     | Format code with Prettier                     |

## Architecture

### Data pipeline

1. **Scrapers** (`scraper/`) fetch model data from vendor APIs (currently AWS Bedrock)
2. Scrapers output to `public/data.json` following the `DataFormat` type
3. At build time, `src/pages/data.db.ts` converts JSON to a SQLite database
4. Client-side sql.js workers query the database for table display

### Key files

- `src/dataFormat.d.ts` - Core type definitions for vendors and models
- `src/sql/schema.ts` - SQLite schema definition
- `scraper/constants.ts` - Model metadata (reasoning capability, self-hostable status, benchmark data)
- `src/constants.ts` - Default table column queries
- `src/state.ts` - Client-side state management with localStorage persistence
- `src/sqlEngine.ts` - Web worker pool for SQL queries

### Path alias

Use `@/src/*` to import from the `src/` directory (configured in tsconfig.json).

## API Access

The data backing models.vantage.sh is available via a free API.

- To get started, create a [free API key](https://docs.vantage.sh/api/authentication).
- Review the API endpoints in the [API documentation](https://docs.vantage.sh/api/prices/get-all-products).

## Keep up-to-date

Feel free to watch/star this repo as we're looking to update the site regularly. Vantage also works on the following relevant projects:

- [EC2Instances.info](https://ec2instances.info/) - A comparison of EC2 instance types and pricing.
- [cur.vantage.sh](https://cur.vantage.sh/) - Definitions of all AWS Cost and Usage Report (CUR) billing codes by service.
- [The Cloud Cost Handbook](https://github.com/vantage-sh/handbook) - An open-source set of guides for best practices of managing cloud costs.
- [The AWS Cost Leaderboard](https://leaderboard.vantage.sh/) - A hosted site of the top AWS cost centers.
- [Vantage](https://vantage.sh/) - A cloud cost transparency platform.

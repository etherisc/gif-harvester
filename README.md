# gif-harvester

Extract gif onchain data via dune into db. 

## Run

Create and migrate the database:

```bash
npm run migrateDev
```

then run the event parser app using

```bash
npm run dev
```

## Environment variables

- `DUNE_API_KEY`: Dune API key
- `DATABASE_URL`: Database URL, use `postgresql://postgres:password@db:5432/postgres?schema=public` for local development environment


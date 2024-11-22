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

## Dune queries

### Gif events on base

```sql
select *
from base.logs_decoded d, base.logs as l
where 
    (
        (
            d.namespace = 'gif_v3'
            and d.contract_address IN (
                0x48b24f2908Bba1fD1a7d68395980e4C9eAbBB4D3, -- registry
                0x0993E4dE66308264381c6e93bF692F30fcD6C1CB, -- instance service
                0xf7d52f3be9B392C8c0aC7D68F8D4c545C2Cbd61c, -- component service
                0x363C9B07081a9c27443aa00091EF31674DC31efe, -- risk service
                0x5e0108ee9bBC663a6480F48c12020A040c748446, -- application service
                0x7Abd9BEDCBDF00331A1da472FfFE7046435205e7, -- policy service
                0x31Ab89d1479184841EC289112E4A03bB5B77Da70, -- claim service
                0x7456efBc3B05006345a15F61A1409E24c2AAc7B1, -- oracle service
                0xb52B2EE9d4761baFbbB8BF78EA90CF23f78bAA03, -- pool service
                0x0f2C69aDD915014c16cc8366C5Af0BF166a3E64C, -- bundle service
                0xF8fC4BAc4c378ceE5A90100A1561793C1aCd4eFf, -- staking service
                0x94f70b56E20426C28705b624482e048b8a5651AD -- staking
            )
        ) 
    or
        ( 
            d.contract_address = 0x33605C6E3DE781CF10E21930f7B1a11599417Ff7 -- gif chain nft token
            and d.namespace = 'erc721'
            and d.event_name = 'Transfer'
        )
    )
    and d.tx_hash = l.tx_hash
    and d.index = l.index
    and d.block_number > {{blocknumber}}
order by 
    d.block_number, 
    d.index
```
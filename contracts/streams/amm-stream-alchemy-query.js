/* 
 * Alchemy GraphQL Webhook Query for AMM Events
 * Filters for AMM events where Router address appears in topics[2]
 * Event signatures: PairCreated, Mint, Burn, Swap, Sync
 */
{
    block {
      hash,
      number,
      timestamp,
      logs(filter: {
        topics: [
          [
            "0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9",
            "0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f",
            "0xdec2bacdd2f05b59de34da9b523dff8be42e5e38e818c82fdb0bae774387a724",
            "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822",
            "0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1"
          ],
          null,
          [
            "0x0000000000000000000000004B883edfd434d74eBE82FE6dB5f058e6fF08cD53"
          ]
        ]
      }) { 
        data,
        topics,
        index,
        account {
          address
        },
        transaction {
          hash,
          index,
          from {
            address
          },
          to {
            address
          },
          value,
          gasUsed,
          status
        }
      }
    }
  }
      

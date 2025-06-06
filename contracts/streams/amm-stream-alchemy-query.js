{
    block {
      hash,
      number,
      timestamp,
      logs(filter: {
        addresses: [
          "0xB6162CcC7E84C18D605c6DFb4c337227C6dC5dF7",
          "0x4B883edfd434d74eBE82FE6dB5f058e6fF08cD53"
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


{
    block(hash: "0xa0fde9a9acaaae9df58feb3dfa27f106c6ea88aedceff27536a7793d799df103") {
      logs(filter: {addresses: ["0x81c48d31365e6b526f6bbadc5c9aafd822134863"], topics: []}) {
        transaction {
          hash
          index
          from {
            address
          }
          to {
            address
          }
          maxFeePerGas
          maxPriorityFeePerGas
          gasUsed
          cumulativeGasUsed
          effectiveGasPrice
          logs {
            account {
              address
            }
            topics
            index
          }
          type
          status
        }
      }
    }
  }
      

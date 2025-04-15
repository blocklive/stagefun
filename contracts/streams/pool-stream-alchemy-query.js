{
    block {
      hash,
      number,
      timestamp,
      logs(filter: {
        topics: [
          [
            "0xa6f06b3ba9a7796573bab39bc2643d47c32efadc0a504262e58b54cd9d633e2e", 
            "0xd9861a9641141da7a608bb821575da486cc59cac5cf3f24e644633d8b9a051b5", 
            "0x83f00c5c08fb55fde46aa16f1732a744093b07a1ca3909114ec61b978d4e5458"  
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
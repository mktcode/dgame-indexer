import { Web3Indexer } from '@mktcodelib/web3indexer'

const indexer = new Web3Indexer({
  provider: "https://eth-sepolia.g.alchemy.com/v2/xvKElJ_umBDERuORIJrMqQbyDDpbqSxx",
  corsOrigin: true,
  port: 3001,
  debug: true,
});

const CONTRACT_ADDRESS = "0xab879B28006F5095ab346Eb525daFeA2cf18Bc3f";
const ABI = [
  "event TokenMinted(uint256 tokenId, address owner, int256 x, int256 y, int256 z)",
  "event LevelUp(uint256 tokenId, uint256 newLevel, string newUri)",
];

indexer.contract(CONTRACT_ADDRESS, ABI, (contract) => {
  contract.on(
    "TokenMinted",
    async (tokenId: bigint, owner: string, x: bigint, y: bigint, z: bigint) => {
      owner = owner.toLowerCase();

      indexer.db.hSet("tokenOwners", tokenId.toString(), owner);
      indexer.db.hSet("tokens", tokenId.toString(), JSON.stringify({
        owner,
        level: 0,
        type: "base",
        name: "Base",
        description: "A player's base",
        image: "artwork/base2.jpeg",
      }));
      indexer.db.hSet("coords", `${x.toString()}:${y.toString()}:${z.toString()}`, tokenId.toString());
    }
  );

  contract.on(
    "LevelUp",
    async (tokenId: bigint, newLevel: bigint, newUri: string) => {
      indexer.db.hSet("tokenLevels", tokenId.toString(), newLevel.toString());
    }
  );
});

indexer.server.get("/tokens/:id", async (req, res) => {
  const tokenId = req.params.id;
  const token = await indexer.db.hGet("tokens", tokenId);

  if (!token) {
    res.sendStatus(404);
  } else {
    res.send(token);
  }
});

indexer.server.get("/coords/:coords", async (req, res) => {
  const coords = req.params.coords;
  const tokenId = await indexer.db.hGet("coords", coords);

  if (!tokenId) {
    res.sendStatus(404);
  } else {
    const token = await indexer.db.hGet("tokens", tokenId);

    if (!token) {
      res.sendStatus(404);
    } else {
      res.send({
        tokenId,
        ...JSON.parse(token)
      });
    }
  }
});

indexer.start();
indexer.replay();
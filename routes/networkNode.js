const express = require('express');
const bodyParser = require('body-parser');
const BlockChain = require('../blockchain/blockchain');
const { v1: uuidv1 } = require('uuid');
const nodeAddress = uuidv1().split('-').join('');
const app = express();
const sikay = new BlockChain();
const port = process.argv[2];
const rp = require('request-promise');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//gets entire blockchain
app.get('/blockchain', function (req, res) {
    res.send(sikay);
});

//creates a new transaction
app.post('/transaction', function (req, res) {
    const newTransaction = req.body;
    const blockIndex = sikay.addTransactionsToPendingTxs(newTransaction);
    res.json({ note: `The transaction will be added in block number ${blockIndex}.` });
});

//broadcasts the transaction to the whole network
app.post('/transaction/broadcast', function (req, res) {
    const newTransaction = sikay.createNewTransaction(req.body.amount, req.body.sender, req.body.recipient);
    sikay.addTransactionsToPendingTxs(newTransaction);

    const requestPromises = [];
    sikay.networkNodes.forEach(networkNodeUrl => {
        const requestOption = {
            uri: networkNodeUrl + '/transaction',
            method: 'POST',
            body: newTransaction,
            json: true
        };
        requestPromises.push(rp(requestOption));
    });
    Promise.all(requestPromises).then(data => {
        res.json({ note: 'Transaction created and broadcasted successfully' });
    });
});

//Adds a new block to the blockchain
app.get('/mine', function (req, res) {
    const lastBlock = sikay.getLastBlock();
    const previousBlockHash = lastBlock.hash;

    const currentBlockData = {
        transactions: sikay.pendingTransactions,
        index: lastBlock.index + 1,
    };

    const nonce = sikay.proofOfWork(previousBlockHash, currentBlockData);
    const blockHash = sikay.calculateHash(previousBlockHash, nonce, currentBlockData);

    const newBlock = sikay.createNewBlock(nonce, previousBlockHash, blockHash);

    const requestPromises = [];
    sikay.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/receive-new-block',
            method: 'POST',
            body: { newBlock: newBlock },
            json: true
        };
        requestPromises.push(rp(requestOptions));
    });
    Promise.all(requestPromises).then(data => {
        const requestOptions = {
            uri: sikay.currentNodeUrl + '/transaction/broadcast',
            method: 'POST',
            body: {
                amount: 10,
                sender: "00",
                recipient: nodeAddress
            },
            json: true
        };
        return rp(requestOptions);
    }).then(data => {
        res.json({
            note: `New block mined successfully.`,
            block: newBlock
        });
    });
});

app.post('/receive-new-block', function(req, res) {
    const newBlock = req.body.newBlock;
    const lastBlock = sikay.getLastBlock();
    const correctHash = lastBlock.hash === newBlock.previousBlockHash;
    const correctIndex = lastBlock.index + 1 === newBlock.index;

    if(correctHash && correctIndex){
        sikay.chain.push(newBlock);
        sikay.pendingTransactions = [];
        res.json({
            note: 'New block recieved and accepted successfully.',
            newBlock: newBlock
        });
    } else{
        res.json({
            note: 'New block rejected.',
            newBlock: newBlock
        });
    }
});

//takes a url and sync the note with every registered node
app.post('/register-and-broadcast-node', function (req, res) {
    const newNodeUrl = req.body.newNodeUrl;
    if (sikay.networkNodes.indexOf(newNodeUrl) == -1) sikay.networkNodes.push(newNodeUrl);

    const regNodePromises = [];
    sikay.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/register-node',
            method: 'POST',
            body: { newNodeUrl: newNodeUrl },
            json: true
        };
        regNodePromises.push(rp(requestOptions));
    });

    Promise.all(regNodePromises).then(data => {
        const bulkRegisterOptions = {
            uri: newNodeUrl + '/register-node-bulk',
            method: 'POST',
            body: { allNetworkNodes: [...sikay.networkNodes, sikay.currentNodeUrl] },
            json: true
        };
        return rp(bulkRegisterOptions);
    }).then(data => {
        res.json({ note: 'New node registered with network successfully.' });
    });
});

app.post('/register-node', function (req, res) {
    const newNodeUrl = req.body.newNodeUrl;
    const notCurrentNode = sikay.currentNodeUrl !== newNodeUrl;
    if (sikay.networkNodes.indexOf(newNodeUrl) == -1 && notCurrentNode) sikay.networkNodes.push(newNodeUrl);
    res.json({ note: 'New node registered successfully.' });
});

app.post('/register-node-bulk', function (req, res) {
    const allNetworkNodes = req.body.allNetworkNodes;
    allNetworkNodes.forEach(networkNodeUrl => {
        const nodeNotPresent = sikay.networkNodes.indexOf(networkNodeUrl) == -1;
        const notCurrentNode = sikay.currentNodeUrl !== networkNodeUrl;
        if (nodeNotPresent && notCurrentNode) sikay.networkNodes.push(networkNodeUrl);
    });
    res.json({ note: 'Bulk registration successful.' });
});


app.get('/consensus', function (req, res) {
    const requestPromises = [];
    sikay.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/blockchain',
            method: 'GET',
            json: true
        };
        requestPromises.push(rp(requestOptions));
    });
    Promise.all(requestPromises).then(blockchains => {
        const currentChainLength = sikay.chain.length;
        let maxChainLength = currentChainLength;
        let newLongestChain = null;
        let newPendingTransactions = null;

        blockchains.forEach(blockchain => {
            if(blockchain.chain.length > maxChainLength){
                maxChainLength = blockchain.chain.length;
                newLongestChain = blockchain.chain;
                newPendingTransactions = blockchain.pendingTransactions;
            }
        });

        if(!newLongestChain || (newLongestChain && !sikay.chainIsValid(newLongestChain))){
            res.json({
                note: 'The current chain has not been replaced.',
                chain: sikay.chain
            });
        }else{
            sikay.chain = newLongestChain;
            sikay.pendingTransactions = newPendingTransactions;
            res.json({
                note: 'The chain has been replaced.',
                chain: sikay.chain
            });
        }
    });
});

app.get('/block/:blockHash', function(req, res) {
    const blockHash = req.params.blockHash;
    const correctBlock = sikay.getBlock(blockHash);
    if(correctBlock !== null) res.json({
        block: correctBlock
    });
    else res.json({
        note: 'The block with provided hash does not exist'
    });
});

app.get('/transaction/:transactionId', function(req, res) {
    const transactionId = req.params.transactionId;
    const transactionData = sikay.getTransaction(transactionId);
    if(transactionData.transaction !== null) res.json({
        transaction: transactionData.transaction,
        block: transactionData.block
    });
    else res.json({
        note: 'The transaction with provided Id does not exist'
    });
});

app.get('/address/:address', function(req, res) {
    const address = req.params.address;
    const addressData = sikay.getAddressData(address);
    res.json({
        addressData: addressData
    });
});


app.listen(port, function () {
    console.log(`Listening on port ${port}....`);
});
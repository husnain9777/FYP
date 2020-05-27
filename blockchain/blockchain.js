const CryptoJS = require('crypto-js');
const currentNodeUrl = process.argv[3];
const { v1: uuidv1 } = require('uuid');

function Blockchain(){
    this.chain = [];
    this.pendingTransactions = [];

    this.currentNodeUrl = currentNodeUrl;
    this.networkNodes = [];

    this.createNewBlock(100,null,this.calculateHash(null, 100, this.transactions));
}

Blockchain.prototype.createNewBlock = function(nonce, previousBlockHash, hash) {
    const newBlock = {
        index: this.chain.length +1,
        timestamp: Date.now(),
        transactions: this.pendingTransactions,
        nonce: nonce,
        hash: hash,
        previousBlockHash: previousBlockHash
    };

    this.pendingTransactions = [];
    this.chain.push(newBlock);
    return newBlock;
};

Blockchain.prototype.getLastBlock = function() {
    return this.chain[this.chain.length - 1];
};

Blockchain.prototype.createNewTransaction = function(amount, sender, recipient) {
    const newTransaction = {
        amount: amount,
        sender: sender,
        recipient: recipient,
        timestamp: Date.now(),
        transactionId: uuidv1().split('-').join('')
    };

    return newTransaction;
};

Blockchain.prototype.addTransactionsToPendingTxs = function(transactionObj){
    this.pendingTransactions.push(transactionObj);
    return this.getLastBlock().index + 1;
};


Blockchain.prototype.calculateHash = function(previousBlockHash, nonce, currentBlockData){
    const dataString = (previousBlockHash + nonce + JSON.stringify(currentBlockData)).toString();   
    let hash = CryptoJS.SHA256(dataString).toString(CryptoJS.enc.Hex);
    return hash;
};

//Proof of work is a mining concept used to mine blocks
Blockchain.prototype.proofOfWork = function(previousBlockHash, currentBlockData){
    let nonce = 0;
    let hash = this.calculateHash(previousBlockHash, nonce, currentBlockData);
    while(hash.substring(0,4) != '0000'){
        nonce++;
        hash = this.calculateHash(previousBlockHash, nonce, currentBlockData);
    }
    return nonce;
};

Blockchain.prototype.chainIsValid = function(blockchain){
    let validChain = true;
    for(var i = 1; i < blockchain.length; i++){
        const currentBlock = blockchain[i];
        const previousBlock = blockchain[i-1];
        //check if data of each block is valid
        const blockHash = this.calculateHash(previousBlock.hash, currentBlock.nonce, {transactions: currentBlock.transactions, index: currentBlock.index});
        if(blockHash.substring(0,4) !== '0000') validChain = false;
        //compares hashes
        if(currentBlock.previousBlockHash !== previousBlock.hash) validChain = false;
    }

    //checking credibility of genesis block
    const genesisBlock = blockchain[0];
    const correctNonce = genesisBlock.nonce === 100;
    const correctPrevHash = genesisBlock.previousBlockHash === null;
    const correctHash = genesisBlock.hash === this.calculateHash(null, 100, this.transactions);
    const correctData = genesisBlock.transactions.length === 0;
    if(!correctNonce || !correctPrevHash || !correctHash || !correctData) validChain = false;

    return validChain;
};

Blockchain.prototype.getBlock = function(blockHash){
    let correctBlock = null;
    this.chain.forEach(block => {
        if(block.hash === blockHash) correctBlock = block;
    });
    return correctBlock;
};

Blockchain.prototype.getTransaction = function(transactionId){
    let correctTransaction = null;
    let correctBlock = null;

    this.chain.forEach(block => {
        block.transactions.forEach(transaction => {
            if(transaction.transactionId === transactionId){
                correctTransaction = transaction;
                correctBlock = block;
            }
        });
    });
    return {
        transaction: correctTransaction,
        block: correctBlock
    };
};

Blockchain.prototype.getAddressData = function(address){
    const addressTnx = [];
    this.chain.forEach(block => {
        block.transactions.forEach(transaction => {
            if(transaction.sender === address || transaction.recipient === address){
                addressTnx.push(transaction);
            }
        });
    });
    let balance = 0;
    addressTnx.forEach(transaction => {
        if(transaction.recipient === address) balance += transaction.amount;
        else if(transaction.sender === address) balance -= transaction.amount;
    });
    return {
        addressTransaction: addressTnx,
        addressBalance: balance
    };
};

module.exports = Blockchain;
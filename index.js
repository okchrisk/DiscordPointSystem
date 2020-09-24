const Discord = require('discord.js');
const client = new Discord.Client();
const { prefix, token } = require('./config.json');

const fs = require('fs');

// ========== CLIENT EVENTS ==========
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    let timer = setInterval(function () {
        console.log(`scanning users...`);
        scanServerAddPoints();
    }, 5 * 60 * 1000); // timer is set to 5 minute intervals
});

client.on('message', async (message) => {
    channelSendUserPoints(message);
    channelSendLotteryPool(message);
    channelSendLotteryReset(message);
    channelSendDrawLotteryWinner(message);
    createUserAccount(message);
    pointsLeaderboard(message);
    pointsPersonalStats(message);
    pointsAddUserPoints(message);
    pointsTransfer(message);
    pointsGambleEvenOdd(message);
    pointsGambleChuck(message);
    pointsGambleRoulette(message);
    pointsGambleDuel(message);
});

// ========== CONST FUNCTIONS ==========
// ----- utility -----
const isEven = function (input) {
    var parsedInput = parseInt(input);

    if (parsedInput % 2 == 0) {
        return true; // returns true if input is even
    }
    return false; // returns false if input is odd
}

const checkUserExist = function (userID) {
    var data = JSON.parse(fs.readFileSync('json/accounts.json', 'utf-8'));

    for (var user in data) {
        if (typeof data[userID] === "object") { // returns true if account exists
            return true;
        }
    }
    return false; // returns false if account does not exist
}

const checkLargestWin = function (userID, points) {
    const currentLargestWin = getUserStatInfo(userID, "largestWin");
    var data = JSON.parse(fs.readFileSync('json/accounts.json', 'utf-8'));

    for (var user in data) {
        if (parseInt(userID) === parseInt(user)) {
            if (currentLargestWin > points) {
                return false; // return false if points won is less than current largest win
            }
            return true; // returns true if points won is more than current largest win
        }
    }
}

const checkLargestLoss = function (userID, points) {
    const currentLargestLoss = getUserStatInfo(userID, "largestLoss");
    var data = JSON.parse(fs.readFileSync('json/accounts.json', 'utf-8'));

    for (var user in data) {
        if (parseInt(userID) === parseInt(user)) {
            if (currentLargestLoss > points) {
                return false; // return false if points lost is less than current largest lost
            }
            return true; // returns true if points lost is more than current largest lost
        }
    }
}

const createAccount = function (userID) {
    var data = JSON.parse(fs.readFileSync('json/accounts.json', 'utf-8'));
    data[userID] = {
        name: getNickname(userID),
        points: 5000,
        totalLost: 0,
        largestWin: 0,
        largestLoss: 0,
        totalWins: 0,
        duelWins: 0,
        totalGamble: 0,
        totalChuck: 0,
        totalRoulette: 0,
        totalDuel: 0
    }
    console.log('Created User: ' + userID);

    fs.writeFileSync('json/accounts.json', JSON.stringify(data));
}

const scanServerAddPoints = function () {
    var connectedUsers = getConnectedUsers();
    var pointsGiven = 500;

    for (var user = 0; user < connectedUsers.length; user++) {
        var currentUser = connectedUsers[user];
        addPoints(currentUser, pointsGiven);
    }
}

const numberWithCommas = function (input) {
    var parts = input.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}

// ----- roll -----
const roll = function (min, max) { // input type is object
    if (!typeof min == `number` || !typeof max == `number`) {
        return false;
    }

    if (min < 0 || min > min) {
        return false;
    }

    return Math.floor(Math.random() * parseInt(max - min + 1)) + min;
}

const generateRollEmbed = function (author, colour, title, desc, footer) {
    // Winner colour: #008000
    // Loser colour: #FF0000
    // Neutral colour: 	#808080

    return new Discord.MessageEmbed()
        .setColor(`${colour}`)
        .setAuthor(`${author}`)
        .setTitle(`${title}`)
        .setDescription(`${desc}`)
        .setFooter(`${footer}`
        );
}

// ----- getters -----
const getVoiceChannels = function () {
    // [0][1] returns channel type
    // [2][1] returns channel id
    const cache = JSON.parse(JSON.stringify(client.guilds.cache));
    const cachedChannels = cache[0].channels;
    var voiceChannelsArray = [];

    cachedChannels.forEach(function (channel) {
        var channelInfo = client.channels.cache.get(channel);
        if (Object.entries(channelInfo)[0][1] == "voice") {
            voiceChannelsArray.push(client.channels.cache.get(Object.entries(channelInfo)[2][1]));
        }
    });
    return voiceChannelsArray;
}

const getConnectedUsers = function () {
    var usersArray = [];
    const currentlyConnectedCollection = getVoiceChannels()[0].guild.voiceStates.cache;
    currentlyConnectedCollection.forEach(function (user) {
        usersArray.push(user.id);
    })
    return usersArray;
}

const getNickname = function (userID) {
    var guildMembers = client.guilds.cache.first().members;
    var nickname = guildMembers.cache.get(`${userID}`).nickname;

    if (nickname != null) {
        return nickname;
    }

    var username = guildMembers.cache.get(`${userID}`).user.username
    return username;
}

const getServerTotalLoss = function () {
    var data = JSON.parse(fs.readFileSync('json/accounts.json', 'utf-8'));
    var total = 0;

    for (var foundUser in data) {
        var user = data[foundUser];
        total += user.totalLost;
    }
    return total;
}

const getLotteryTotal = function () {
    var data = JSON.parse(fs.readFileSync('json/stats.json', 'utf-8'));
    for (var stat in data) {
        if (stat == "lottery") {
            return data[stat].points;
        }
    }
}

const getLotteryWinner = function () {
    var data = JSON.parse(fs.readFileSync('json/accounts.json', 'utf-8'));
    var accountList = [];

    for (userId in data) {
        accountList.push(userId);
    }

    var numEntries = accountList.length - 1;
    var winnerArraySpot = roll(0, numEntries);
    var winnerId = accountList[winnerArraySpot];

    return winnerId;
}

const getUserPoints = function (userID) {
    var data = JSON.parse(fs.readFileSync('json/accounts.json', 'utf-8'));

    for (var user in data) { // i is userID
        if (parseInt(userID) === parseInt(user)) {
            return data[user].points;
        }
    }
}

const getUserAccount = function (userID) {
    var data = JSON.parse(fs.readFileSync('json/accounts.json', 'utf-8'));

    for (var user in data) { // i is userID
        if (parseInt(userID) === parseInt(user)) {
            return data[user];
        }
    }
}

const getUserStatInfo = function (userID, property) {
    const validProperties = ["points", "totalLost", "largestWin", "largestLoss", "totalGamble", "totalChuck", "totalRoulette", "duelWins", "totalWins", "totalDuel"];
    var data = JSON.parse(fs.readFileSync('json/accounts.json', 'utf-8'));

    if (!validProperties.includes(property)) {
        return console.log(`Error with input: getUserStatInfo(????)`);
    }

    for (var i in data) { // i is userID
        if (parseInt(userID) === parseInt(i)) {
            return data[i][property];
        }
    }
}

const getRouletteProperty = function (searchFor, property) {
    const rouletteProperties = ["red", "black", "even", "odd", "low", "high"];
    const entry = parseInt(searchFor);
    if (isNaN(entry) || entry < 0) {
        return false;
    }

    if (!rouletteProperties.includes(property.toString())) {
        return false;
    }

    var data = JSON.parse(fs.readFileSync('json/roulette.json', 'utf-8'));

    for (var i in data) {
        let number = data[i];
        if (i == entry) {
            return number[property];
        }
    }
}

const getRandomEntry = function (arr) {
    let size = arr.length;

    if (size == 1) {
        return arr[0]; // if array size is a single entry, return the first
    }

    let randomNumber = roll(0, size);

    return arr[randomNumber];
}

// ----- stats -----
const addGlobalStatChuck = function () {
    var data = JSON.parse(fs.readFileSync('json/stats.json', 'utf-8'));

    for (var i in data) {
        var stat = data[i];
        if (i == "chuck") {
            stat.invoked += 1;
        }
    }
    fs.writeFileSync('json/stats.json', JSON.stringify(data));
}

const addGlobalStatGamble = function (input) {
    const validInputs = ["even", "odd"];

    if (!validInputs.includes(input)) {
        return console.log(`Error with input: addGlobalStatGamble(????)`);
    }

    var data = JSON.parse(fs.readFileSync('json/stats.json', 'utf-8'));
    for (var i in data) {
        var stat = data[i];
        if (i == "gamble") {
            stat[input] += 1;
        }
    }

    fs.writeFileSync('json/stats.json', JSON.stringify(data));
}

const addGlobalStatTransfer = function () {
    var data = JSON.parse(fs.readFileSync('json/stats.json', 'utf-8'));

    for (var i in data) {
        var stat = data[i];
        if (i == "transfer") {
            stat.invoked += 1;
        }
    }

    fs.writeFileSync('json/stats.json', JSON.stringify(data));
}

const addGlobalStatRoulette = function (input) {
    const validInputs = ["soloNumber", "red", "black", "even", "odd", "row", "column", "low", "high"];
    if (!validInputs.includes(input)) {
        return console.log(`Error with input: addGlobalStatRoulette(????)`);
    }

    var data = JSON.parse(fs.readFileSync('json/stats.json', 'utf-8'));

    for (var i in data) {
        var stat = data[i];
        if (i == "roulette") {
            stat[input] += 1;
        }
    }

    fs.writeFileSync('json/stats.json', JSON.stringify(data));
}

const addGlobalStatDuel = function () {
    var data = JSON.parse(fs.readFileSync('json/stats.json', 'utf-8'));

    for (var i in data) {
        var stat = data[i];
        if (i == "duel") {
            stat.invoked += 1;
        }
    }

    fs.writeFileSync('json/stats.json', JSON.stringify(data));
}

const addPersonalStatLargestX = function (userID, type, points) {
    var data = JSON.parse(fs.readFileSync('json/accounts.json', 'utf-8'));

    for (var i in data) {
        var user = data[i];
        if (i == userID) {
            if (type == "win") {
                user.largestWin = parseInt(points);
            }

            if (type == "loss") {
                user.largestLoss = parseInt(points);
            }
        }
    }

    fs.writeFileSync('json/accounts.json', JSON.stringify(data));
}

const addPersonalStatX = function (userID, type, win, duelOutcome, isDuel) {
    var data = JSON.parse(fs.readFileSync('json/accounts.json', 'utf-8'));

    for (var i in data) {
        var user = data[i];
        if (i == userID) {
            //logic for each argument here
            if (type == "gamble") {
                user.totalGamble += 1;
            }

            if (type == "chuck") {
                user.totalChuck += 1;
            }

            if (type == "roulette") {
                user.totalRoulette += 1;
            }

            if (win == true) {
                user.totalWins += 1;
            }

            if (duelOutcome == true) {
                user.duelWins += 1;
            }

            if (isDuel == true) {
                user.totalDuel += 1;
            }
        }
    }

    fs.writeFileSync('json/accounts.json', JSON.stringify(data));
}

// ----- points -----
const addLotteryPoints = function (points) {
    var parsedPoints = parseInt(points);
    var data = JSON.parse(fs.readFileSync('json/stats.json', 'utf-8'));

    for (var i in data) { // i is userID
        if (i == "lottery") {
            var stat = data[i];
            stat.points += parsedPoints;
        }
    }

    fs.writeFileSync('json/stats.json', JSON.stringify(data));
}

const addPoints = function (userID, points) {
    var parsedPoints = parseInt(points);
    var data = JSON.parse(fs.readFileSync('json/accounts.json', 'utf-8'));

    for (var i in data) {
        var user = data[i];
        if (i == userID) {
            user.points += parsedPoints;
        }
    }

    fs.writeFileSync('json/accounts.json', JSON.stringify(data));
}

const minusPoints = function (userID, points, personal) {
    var parsedPoints = parseInt(points);
    var data = JSON.parse(fs.readFileSync('json/accounts.json', 'utf-8'));

    if (!personal) { //not adding to totalLost --> etransfer
        for (var i in data) {
            var user = data[i];
            if (i == userID) {
                user.points -= parsedPoints;
            }
        }
    }
    else {
        for (var i in data) {
            var user = data[i];
            if (i == userID) {
                user.points -= parsedPoints;
                user.totalLost += parsedPoints;
            }
        }
    }

    fs.writeFileSync('json/accounts.json', JSON.stringify(data));
}


// ========== CALLED FUNCTIONS ==========
function channelSendUserPoints(message) {
    if (message.content === `${prefix}points`) {
        if (!checkUserExist(message.author.id)) {
            return message.reply(`Account does not exist.`);
        }

        message.reply(`you have ${numberWithCommas(getUserPoints(message.author.id))} points.`);
    }
}

function channelSendLotteryPool(message) {
    if (message.content === `${prefix}lottery`) {
        message.channel.send(`The lottery pool is **${numberWithCommas(getLotteryTotal())}** points.\nAll -etransfer taxes contribute to the lottery pool.`);
    }
}

function channelSendLotteryReset(message) {
    if (message.content === `${prefix}lottery reset`) {
        var authorizedUser = 000; // discord user ID of authorized user goes here.

        if (message.author.id != authorizedUser) {
            return message.channel.send(`Not authorized, set an authorized user in main code`);
        }

        var data = JSON.parse(fs.readFileSync('json/stats.json', 'utf-8'));

        for (var stat in data) { // i is userID
            if (stat == "lottery") {
                data[stat].totalGiven += data[stat].points;
                data[stat].points = 100000;
            }
        }
        fs.writeFileSync('json/stats.json', JSON.stringify(data));
        message.channel.send(`The lottery pool has been reset to 0.`);
    }
}

function channelSendDrawLotteryWinner(message) {
    if (message.content === `${prefix}lottery draw`) {
        var authorizedUser = 000; // discord user ID of authorized user goes here.

        if (message.author.id != authorizedUser) {
            return message.channel.send(`Not authorized, set an authorized user in main code`);
        }

        var lotteryTotal = numberWithCommas(getLotteryTotal());
        var winner = getLotteryWinner();
        //var nickname = getNickname(winner);
        return message.channel.send(`The winner of the ${lotteryTotal} point lotter is **<@${winner}>**`);
    }
}

function createUserAccount(message) {
    if (message.content === `${prefix}start`) {
        if (checkUserExist(message.author.id)) {
            return message.reply(`your account already exists.`);
        }

        createAccount(message.author.id);
        return message.reply(`your account has been created.`);
    }
}

function pointsTransfer(message) {
    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift();
    if (command == 'etransfer') {
        if (!checkUserExist(message.author.id)) {
            return message.reply(`Account does not exist.`);
        }

        const str = args[0];
        var userID = str.replace(/[^0-9 ]/g, "");
        //var points = parseInt(args[1].replace(/\,(\d\d)$/, ".$1").replace(',', ''));
        var points = args[1].replace(/,/g, '');
        if (args.length != 2 || isNaN(points) || points < 10 || points > getUserPoints(message.author.id)) {
            return message.channel.send(`Invalid entry: -etransfer [@user] [points, >10].`);
        }

        if (!checkUserExist(userID)) {
            return message.channel.send(`Invalid entry: User does not exist`);
        }
        var taxRate = 0.18;
        var taxedPoints = parseInt(points * (1 - taxRate));
        var totalTax = parseInt(points - taxedPoints);

        addGlobalStatTransfer();
        minusPoints(message.author.id, points, false);
        addPoints(userID, taxedPoints);
        addLotteryPoints(totalTax);

        return message.channel.send(`<@!${message.author.id}> has given ${getNickname(userID)} ${numberWithCommas(taxedPoints)} points.`);

    }
}

function pointsAddUserPoints(message) {
    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift();
    if (command == 'addpoints') {
        if (!checkUserExist(message.author.id)) {
            return message.reply(`Account does not exist.`);
        }

        var authorizedUser = 000; // discord user ID of authorized user goes here.

        if (message.author.id != authorizedUser) {
            return message.channel.send(`Not authorized, set an authorized user in main code`);
        }

        const givePointsTo = args[0].toString();
        var userID = givePointsTo.replace(/[^0-9 ]/g, "");
        var points = args[1].replace(/,/g, '');

        if (args.length != 2 || isNaN(points) || points < 1) {
            return message.channel.send(`Invalid entry: -addpoints [@user/ all] [points] / User does not exist.`);
        }
        else {
            if (givePointsTo == "all") {
                const allUsers = getConnectedUsers();

                for (user of allUsers) {
                    addPoints(user, points);
                }

                return message.channel.send(`All users were given ${points} points.`);
            }
            else {
                if (!checkUserExist(userID)) {
                    return message.reply(`Account does not exist.`);
                }

                addPoints(userID, points);
                return message.channel.send(`<@!${userID}> has been given ${numberWithCommas(points)} points.`);
            }
        }
    }
}

function pointsLeaderboard(message) {
    if (message.content === `${prefix}leaderboard`) {
        var data = JSON.parse(fs.readFileSync('json/accounts.json', 'utf-8'));
        //var guildMembers = client.guilds.cache.first().members;
        var arr = [];

        for (i in data) {
            arr.push([i, data[i].points])
        }
        arr.sort(function (a, b) { return b[1] - a[1] });

        // arr[0][0] gives userID type: string
        // arr[0][1] gives object Object (contains points) type: number
        message.channel.send(
            "Total Loss: " + numberWithCommas(getServerTotalLoss()) + "\n" +
            "1. " + getNickname(arr[0][0]) + ": " + numberWithCommas(arr[0][1]) + "\n" +
            "2. " + getNickname(arr[1][0]) + ": " + numberWithCommas(arr[1][1]) + "\n" +
            "3. " + getNickname(arr[2][0]) + ": " + numberWithCommas(arr[2][1]) + "\n" +
            "4. " + getNickname(arr[3][0]) + ": " + numberWithCommas(arr[3][1]) + "\n" +
            "5. " + getNickname(arr[4][0]) + ": " + numberWithCommas(arr[4][1])
        );
    }
}

function pointsPersonalStats(message) {
    if (message.content === `${prefix}stats`) {
        if (!checkUserExist(message.author.id)) {
            return message.reply(`Account does not exist.`);
        }
        var user = getUserAccount(message.author.id);

        var points = user.points;
        var pointsLost = user.totalLost;
        var largeWin = user.largestWin;
        var largeLost = user.largestLoss;
        var totalWins = user.totalWins;
        var duelWins = user.duelWins;
        var totalGamble = user.totalGamble;
        var totalChuck = user.totalChuck;
        var totalRoulette = user.totalRoulette;
        var totalDuel = user.totalDuel;
        var winPercentage = ((totalWins * 1.0) / (totalChuck + totalGamble + totalRoulette + totalDuel * 1.0) * 100).toFixed(2);

        message.reply("\n" +
            "Win Percentage: " + winPercentage + "%\n" +
            "Points: " + numberWithCommas(points) + "\n" +
            "Total lost: " + numberWithCommas(pointsLost) + "\n" +
            "Largest Win: " + numberWithCommas(largeWin) + "\n" +
            "Largest Loss: " + numberWithCommas(largeLost) + "\n" +
            "Total Wins: " + numberWithCommas(totalWins) + " **|** Duel Wins: " + numberWithCommas(duelWins) + "\n" +
            "Chucks: " + numberWithCommas(totalChuck) + " **|** Gambles: " + numberWithCommas(totalGamble) + " **|** Roulette: " + numberWithCommas(totalRoulette) + "\n"
        );
    }
}

function pointsGambleEvenOdd(message) {
    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift();
    if (command === `gamble`) {
        if (!checkUserExist(message.author.id)) {
            return message.reply(`Account does not exist.`);
        }

        if (args.length != 2) {
            return message.channel.send(`Invalid entry: -gamble [points] [even/odd].`);
        }
        else {
            var bet = args[0].replace(/,/g, '');
            var choice = args[1].toString();

            if (isNaN(bet) || bet < 1 || bet > getUserPoints(message.author.id) || choice != "even" && choice != "odd") {
                return message.channel.send(`Invalid entry: Check point value, point balance or spelling.`);
            }
            else {
                var rolledNumber = roll(1, 2);

                switch (choice) {
                    case "even":
                        addGlobalStatGamble("even");
                        //win even
                        //crit even
                        if (isEven(rolledNumber)) {
                            var critOdds = 4;
                            var critNumRolled = roll(1, 100);
                            var critRate = 2;

                            if (critNumRolled <= critOdds) {
                                addPoints(message.author.id, bet * critRate);
                                addPersonalStatX(message.author.id, "gamble", true, false, false);
                                if (checkLargestWin(message.author.id, bet * critRate)) {
                                    addPersonalStatLargestX(message.author.id, "win", bet * critRate);
                                }
                                return message.channel.send(
                                    generateRollEmbed(
                                        message.author.tag,
                                        `#008000`,
                                        `**CRITICAL 2x\nYou won ${numberWithCommas(bet * critRate)} points!**`,
                                        `You have: ${numberWithCommas(getUserPoints(message.author.id))} points.\n\nGuess: even\nRolled: ${rolledNumber}`,
                                        `Rolling [1,2]`
                                    ));
                            }

                            // non crit even
                            else {
                                addPoints(message.author.id, bet);
                                addPersonalStatX(message.author.id, "gamble", true, false, false);
                                if (checkLargestWin(message.author.id, bet)) {
                                    addPersonalStatLargestX(message.author.id, "win", bet);
                                }
                                return message.channel.send(
                                    generateRollEmbed(
                                        message.author.tag,
                                        `#008000`,
                                        `**You won ${numberWithCommas(bet)} points!**`,
                                        `You have: ${numberWithCommas(getUserPoints(message.author.id))} points.\n\nGuess: even\nRolled: ${rolledNumber}`,
                                        `Rolling [1,2]`
                                    ));
                            }
                        }
                        // lose even
                        minusPoints(message.author.id, bet, true);
                        addLotteryPoints(parseInt(bet * 0.01));
                        addPersonalStatX(message.author.id, "gamble", false, false, false);
                        if (checkLargestLoss(message.author.id, bet)) {
                            addPersonalStatLargestX(message.author.id, "loss", bet);
                        }
                        return message.channel.send(
                            generateRollEmbed(
                                message.author.tag,
                                `#FF0000`,
                                `**You lost ${numberWithCommas(bet)} points!**`,
                                `You have: ${numberWithCommas(getUserPoints(message.author.id))} points.\n\nGuess: even\nRolled: ${rolledNumber}`,
                                `Rolling [1,2]`
                            ));

                    case "odd":
                        addGlobalStatGamble("odd");

                        //win odd
                        //crit odd
                        if (!isEven(rolledNumber)) {
                            var critOdds = 4;
                            var critNumRolled = roll(1, 100);
                            var critRate = 2;

                            if (critNumRolled <= critOdds) {
                                addPoints(message.author.id, bet * critRate);
                                addPersonalStatX(message.author.id, "gamble", true, false, false);
                                if (checkLargestWin(message.author.id, bet * critRate)) {
                                    addPersonalStatLargestX(message.author.id, "win", bet * critRate);
                                }
                                return message.channel.send(
                                    generateRollEmbed(
                                        message.author.tag,
                                        `#008000`,
                                        `**CRITICAL 2x\nYou won ${numberWithCommas(bet * critRate)} points!**`,
                                        `You have: ${numberWithCommas(getUserPoints(message.author.id))} points.\n\nGuess: odd\nRolled: 1`,
                                        `Rolling [1,2]`
                                    ));
                            }
                            
                            //non crit odd
                            else {
                                addPoints(message.author.id, bet);
                                addPersonalStatX(message.author.id, "gamble", true, false, false);
                                if (checkLargestWin(message.author.id, bet)) {
                                    addPersonalStatLargestX(message.author.id, "win", bet);
                                }
                                return message.channel.send(
                                    generateRollEmbed(
                                        message.author.tag,
                                        `#008000`,
                                        `**You won ${numberWithCommas(bet)} points!**`,
                                        `You have: ${numberWithCommas(getUserPoints(message.author.id))} points.\n\nGuess: odd\nRolled: 1`,
                                        `Rolling [1,2]`
                                    ));
                            }
                        }

                        //lose odd
                        minusPoints(message.author.id, bet, true);
                        addLotteryPoints(parseInt(bet * 0.01));
                        addPersonalStatX(message.author.id, "gamble", false, false, false);
                        if (checkLargestLoss(message.author.id, bet)) {
                            addPersonalStatLargestX(message.author.id, "loss", bet);
                        }
                        return message.channel.send(
                            generateRollEmbed(
                                message.author.tag,
                                `#FF0000`,
                                `**You lost ${numberWithCommas(bet)} points!**`,
                                `You have: ${numberWithCommas(getUserPoints(message.author.id))} points.\n\nGuess: odd\nRolled: 2`,
                                `Rolling [1,2]`
                            ));

                }
            }
        }
    }
}

function pointsGambleChuck(message) {
    if (message.content === `${prefix}chuck`) {
        if (!checkUserExist(message.author.id)) {
            return message.reply(`Account does not exist.`);
        }

        var points = getUserPoints(message.author.id);

        if (points == 0) {
            return message.reply(`you have ${points} points.`);
        }

        addGlobalStatChuck();
        var rolledNumber = roll(1, 10000);
        var winPercentage = 48.6 * 100;// <= 4860 is equal to 48.6% to win
        var rate = 1.25;

        // lose
        if (rolledNumber > winPercentage) { 
            minusPoints(message.author.id, points, true);
            addLotteryPoints(parseInt(points * 0.1));
            addPersonalStatX(message.author.id, "chuck", false, false, false);
            if (checkLargestLoss(message.author.id, points)) {
                addPersonalStatLargestX(message.author.id, "loss", points);
            }
            return message.channel.send(
                generateRollEmbed(
                    message.author.tag,
                    `#FF0000`,
                    `**You lost ${numberWithCommas(points)} points!**`,
                    `You have: ${numberWithCommas(getUserPoints(message.author.id))} points.\n\nGuess: odd\nRolled: 2`,
                    `Rolling [1,2]`
                ));
        }

        // win
        //if crit
        var critOdds = 4;
        var critNumRolled = roll(1, 100);
        var critRate = 2;

        if (critNumRolled <= critOdds) {
            addPoints(message.author.id, parseInt(rate * points * critRate));
            addPersonalStatX(message.author.id, "chuck", true, false, false);
            if (checkLargestWin(message.author.id, parseInt(rate * points * critRate))) {
                addPersonalStatLargestX(message.author.id, "win", parseInt(rate * points * critRate));
            }
            return message.channel.send(
                generateRollEmbed(
                    message.author.tag,
                    `#008000`,
                    `**CRITICAL 2x\nYou won ${numberWithCommas(parseInt(rate * points * critRate))} points!**`,
                    `You have: ${numberWithCommas(getUserPoints(message.author.id))} points.\n\nGuess: odd\nRolled: 1`,
                    `Rolling [1,2]`
                ));
        }
        //no crit
        else {
            addPoints(message.author.id, parseInt(rate * points));
            addPersonalStatX(message.author.id, "chuck", true, false, false);
            if (checkLargestWin(message.author.id, parseInt(rate * points))) {
                addPersonalStatLargestX(message.author.id, "win", parseInt(rate * points));
            }
            return message.channel.send(
                generateRollEmbed(
                    message.author.tag,
                    `#008000`,
                    `**You won ${numberWithCommas(parseInt(rate * points))} points!**`,
                    `You have: ${numberWithCommas(getUserPoints(message.author.id))} points.\n\nGuess: odd\nRolled: 1`,
                    `Rolling [1,2]`
                ));
        }
    }
}

function pointsGambleRoulette(message) {
    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift();
    if (command === `roulette`) {
        if (!checkUserExist(message.author.id)) {
            return message.reply(`Account does not exist.`);
        }

        if (args.length == 0) {
            message.channel.send({ files: [`images/roulette/roulette.jpg`] });
            return (message.channel.send(`roulette [points] [number guess] => 35x payout\nroulette [points] [even/odd] => 1x payout\nroulette [points] [red/black] => 1x payout\nroulette [points] [low/high] => 1x payout`));
        }

        if (args.length == 2) {//guessing even/odd, red/black, low/high, 1/2/3dozen
            var bet = args[0].replace(/,/g, '');
            if (isNaN(bet) || bet < 1 || bet > getUserPoints(message.author.id)) {
                return message.channel.send('Invalid roulette entry');
            }

            var rate = 1;
            const choice = args[1];
            const rolledNumber = roll(0, 36);

            if (!isNaN(choice)) { //guessing a specific number
                if (choice < 0 || choice > 36) {
                    return message.channel.send('Invalid roulette entry');
                }

                rate = 35;
                addGlobalStatRoulette("soloNumber");
                if (choice != rolledNumber) {
                    minusPoints(message.author.id, bet, true);

                    addPersonalStatX(message.author.id, "roulette", false, false, false);
                    if (checkLargestLoss(message.author.id, bet)) {
                        addPersonalStatLargestX(message.author.id, "loss", bet);
                    }
                    return message.channel.send(
                        generateRollEmbed(
                            message.author.tag,
                            `#FF0000`,
                            `**You lost ${numberWithCommas(bet)} points!**`,
                            `You have: ${numberWithCommas(getUserPoints(message.author.id))} points.\n\nGuess: ${choice}\nRolled: ${rolledNumber}`,
                            `Rolling [0,36]`
                        ));
                }

                addPoints(message.author.id, rate * bet);
                addPersonalStatX(message.author.id, "roulette", true, false, false);
                if (checkLargestWin(message.author.id, rate * bet)) {
                    addPersonalStatLargestX(message.author.id, "win", rate * bet);
                }
                return message.channel.send(
                    generateRollEmbed(
                        message.author.tag,
                        `#008000`,
                        `**You won ${numberWithCommas(rate * bet)} points**`,
                        `You have: ${numberWithCommas(getUserPoints(message.author.id))} points.\n\nGuess: ${choice}\nRolled: ${rolledNumber}`,
                        `Rolling [0,36]`
                    ));
            }

            const validRouletteProperties = ["red", "black", "even", "odd", "low", "high"];
            if (!validRouletteProperties.includes(choice.toString())) {
                return message.channel.send("Invalid roulette entry");
            }

            var result = getRouletteProperty(rolledNumber, choice);
            addGlobalStatRoulette(choice.toString());
            if (!result) {
                minusPoints(message.author.id, bet, true);
                addPersonalStatX(message.author.id, "roulette", false, false, false);
                if (checkLargestLoss(message.author.id, bet)) {
                    addPersonalStatLargestX(message.author.id, "loss", bet);
                }
                return message.channel.send(
                    generateRollEmbed(
                        message.author.tag,
                        `#FF0000`,
                        `**You lost ${numberWithCommas(bet)} points!**`,
                        `You have: ${numberWithCommas(getUserPoints(message.author.id))} points.\n\nGuess: ${choice}\nRolled: ${rolledNumber}`,
                        `Rolling [0,36]`
                    ));
            }

            addPoints(message.author.id, rate * bet);
            addPersonalStatX(message.author.id, "roulette", true, false, false);
            if (checkLargestWin(message.author.id, rate * bet)) {
                addPersonalStatLargestX(message.author.id, "win", rate * bet);
            }
            return message.channel.send(
                generateRollEmbed(
                    message.author.tag,
                    `#008000`,
                    `**You won ${numberWithCommas(rate * bet)} points**`,
                    `You have: ${numberWithCommas(getUserPoints(message.author.id))} points.\n\nGuess: ${choice}\nRolled: ${rolledNumber}`,
                    `Rolling [0,36]`
                ));

        }
        else {
            return message.channel.send("Invalid roulette entry");
        }
    }
}

function pointsGambleDuel(message) {
    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift();
    if (command === `duel`) {
        if (!checkUserExist(message.author.id)) {
            return message.reply(`Account does not exist.`);
        }

        if (args.length != 1 || isNaN(args[0]) || args[0] < 1 || args[0] > getUserPoints(message.author.id)) {
            return message.channel.send("Invalid entry: -duel [points], Check your points.");
        }

        const botID = 718703704340955176;
        var bet = args[0].replace(/,/g, '');
        message.react('👍');

        const filter = (reaction, user) => {
            return ['👍'].includes(reaction.emoji.name) && user.id != message.author.id && user.id != botID;
        };

        message.awaitReactions(filter, { max: 1, time: 30000, errors: ['time'] })
            .then(collected => {
                const reaction = collected.first();
                const users = JSON.parse(JSON.stringify(reaction.users.cache));

                if (reaction.emoji.name === '👍') {
                    var contestants = [];
                    users.forEach(function (user) {
                        if (user.id != message.author.id && user.id != botID) {
                            contestants.push(user.id);
                        }
                    })

                    var duelist = getRandomEntry(contestants);

                    if (getUserPoints(duelist) < bet) {
                        return message.channel.send(`<@!${duelist}> does not have enough points`);
                    }

                    const userRoll = roll(0, 100);
                    const duelistRoll = roll(0, 100);
                    addGlobalStatDuel();
                    if (userRoll > duelistRoll) {
                        addPoints(message.author.id, bet);
                        minusPoints(duelist, bet, true);
                        addPersonalStatX(message.author.id, null, true, true, true);
                        if (checkLargestWin(message.author.id, bet)) {
                            addPersonalStatLargestX(message.author.id, "win", bet);
                        }
                        if (checkLargestLoss(duelist, bet)) {
                            addPersonalStatLargestX(duelist, "loss", bet);
                        }
                        return message.channel.send(
                            generateRollEmbed(
                                `${getNickname(message.author.id)} vs. ${getNickname(duelist)}`,
                                `#800080`,
                                `**${getNickname(message.author.id)} won ${numberWithCommas(bet)} points!**`,
                                `${getNickname(message.author.id)}: ${userRoll} (${numberWithCommas(getUserPoints(message.author.id))})\n${getNickname(duelist)}: ${duelistRoll} (${numberWithCommas(getUserPoints(duelist))})`,
                                `Rolling [0,100]`
                            ));
                    }
                    else if (userRoll < duelistRoll) {
                        minusPoints(message.author.id, bet, true);
                        addPoints(duelist, bet);
                        addPersonalStatX(duelist, null, true, true, true);
                        if (checkLargestWin(duelist, bet)) {
                            addPersonalStatLargestX(duelist, "win", bet);
                        }
                        if (checkLargestLoss(message.author.id, bet)) {
                            addPersonalStatLargestX(message.author.id, "loss", bet);
                        }
                        return message.channel.send(
                            generateRollEmbed(
                                `${getNickname(message.author.id)} vs. ${getNickname(duelist)}`,
                                `#800080`,
                                `**${getNickname(duelist)} won ${numberWithCommas(bet)} points!**`,
                                `${getNickname(message.author.id)}: ${userRoll} (${numberWithCommas(getUserPoints(message.author.id))})\n${getNickname(duelist)}: ${duelistRoll} (${numberWithCommas(getUserPoints(duelist))})`,
                                `Rolling [0,100]`
                            ));
                    }

                    return message.channel.send(
                        generateRollEmbed(
                            `${getNickname(message.author.id)} vs. ${getNickname(duelist)}`,
                            `#800080`,
                            `**Tie Game xd**`,
                            `${getNickname(message.author.id)} rolled ${userRoll} (${numberWithCommas(getUserPoints(message.author.id))})\n${getNickname(duelist)} rolled ${duelistRoll} (${numberWithCommas(getUserPoints(duelist))})`,
                            `Rolling [0,100]`
                        ));
                }
            })
            .catch(collected => {
                message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
            });
    }
}

client.login(token);

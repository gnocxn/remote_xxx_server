var chalk = require('chalk');

module.exports = {
	Error : function(msg){
		return chalk.bold.red(msg);
	},
	Warning : function(msg){
		return chalk.bold.yellow(msg);
	},
	Success : function(msg){
		return chalk.bold.green(msg);
	}
}
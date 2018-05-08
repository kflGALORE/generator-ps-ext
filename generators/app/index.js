const Generator = require('yeoman-generator');

const fs = require('fs');
const path = require('path');
const makedir = require('make-dir');
const http = require('request');

module.exports = class extends Generator {
	constructor(args, opts) {
		super(args, opts);
		
		this.context = {
			extension: {
				photoshop: {},
				cep: {}
			},
			
			applyAnswers(answers) {
				this.extension.id = answers.extensionId;
				this.extension.name = answers.extensionName;
				this.extension.photoshop.versionName = answers.psVersionName[0];
			}
		}
	}
	
	initializing () {
		if (! (this._isRunningOnWin() || this._isRunningOnMac())) {
			throw new Error('This yo generator must be run on Windows or Mac platform.');
		}
	}
	
	prompting() {
		return this.prompt([
				{
					type: 'input',
					name: 'extensionId',
					message: 'Extension ID:',
					validate: Validations.valueIsId
				},
				{
					type: 'input',
					name: 'extensionName',
					message: 'Extension name:',
					validate: Validations.valueIsSpecified
				},
				{
					type: 'checkbox',
					name: 'psVersionName',
					choices: ['CC 2014', 'CC 2015', 'CC 2015.1', 'CC 2015.5', 'CC 2017', 'CC 2018'],
					default: ['CC 2015'],
					message: 'Photoshop version:',
					validate: Validations.exactlyOneOptionIsSelected
				}	
			])
			.then((answers) => {
				this.context.applyAnswers(answers);
			});
	};
	
	configuring() {
		this.extensionPath = this.destinationPath(this.context.extension.id);
		
		// apply defaults
		if (this._isRunningOnWin()) {
			this.context.extension.deploymentDir = path.normalize(process.env.APPDATA + '/Adobe/CEP/extensions/' + this.context.extension.id);
		} else {
			this.context.extension.deploymentDir = path.normalize(process.env.HOME + '/Library/Application Support/Adobe/CEP/extensions/' + this.context.extension.id);
		}
		this.context.extension.photoshop.debugPort = 9080;
		
		// map versions
		const psMapping = psMappings[this.context.extension.photoshop.versionName];
		this.context.extension.photoshop.versionId = psMapping.photoshop.versionId;
		this.context.extension.cep.versionId = psMapping.cep.versionId;
		this.context.extension.cep.downloadURL = psMapping.cep.downloadURL;
		
		this.fs.writeJSON(this.extensionPath + '/ps-extension.js', this.context.extension);
	};
	
	writing() {
		this.fs.copyTpl(
			this.templatePath('**'), 
			this.extensionPath, 
			this.context, 
			{}, 						// templateOptions: use defaults 
			{globOptions: {dot: true}} 	// copyOptions: include '.xxx' files and directories
		);
	};
	
	install() {
		this._npmInstall();
		this._npmInstall('host');
		this._npmInstall('ui');
		this._downloadCEP('ui');
	};
	
	_npmInstall(module) {
		var dir = this.extensionPath;
		if (module) {
			dir = dir + '/' + module;
		}
		
		this.spawnCommandSync('npm', ['install'], {"cwd": dir});
	};
	
	_downloadCEP(module) {
		var cepFileNames = ['CSInterface.js', 'Vulcan.js', 'AgoraLib.js'];
		var cepBaseURL = this.context.extension.cep.downloadURL;
		var targetDir = this.extensionPath + '/' + module + '/libs/cep';
		
		this._ensureDirExists(targetDir);
		
		for (let i = 0; i < cepFileNames.length; i++) {
			let cepFileName = cepFileNames[i];
			let cepFileURL = cepBaseURL + '/' + cepFileName;
			let targetFile = targetDir + '/' + cepFileName;
			
			this.log('download ' + cepFileURL);
			http.get(cepFileURL, {timeout: 10000})
				.on('error', error => {
					throw new Error(error);
				})
				.pipe(fs.createWriteStream(targetFile));
		}
	};
	
	_isRunningOnWin() {
		return process.platform.startsWith('win');
	};
	
	_isRunningOnMac() {
		return process.platform === 'darwin';
	};
	
	_ensureDirExists(dir) {
		if (! fs.existsSync(dir)) {
			makedir.sync(dir);
		}
	}

};

const psMappings = {
	"CC 2014": {
        photoshop: {versionId: "15.0"},
        cep: {versionId: "5.0", downloadURL: "http://raw.githubusercontent.com/Adobe-CEP/CEP-Resources/master/CEP_5.x"}
    },
    "CC 2015": {
		photoshop: {versionId: "16.0"},
        cep: {versionId: "6.0", downloadURL: "http://raw.githubusercontent.com/Adobe-CEP/CEP-Resources/master/CEP_6.x"}
    },
    "CC 2015.1": {
		photoshop: {versionId: "17.0.2"},
        cep: {versionId: "7.0", downloadURL: "http://raw.githubusercontent.com/Adobe-CEP/CEP-Resources/master/CEP_7.x"}
    },
    "CC 2015.5": {
		photoshop: {versionId: "17.0.2"},
        cep: {versionId: "7.0", downloadURL: "http://raw.githubusercontent.com/Adobe-CEP/CEP-Resources/master/CEP_7.x"}
    },
    "CC 2017": {
		photoshop: {versionId: "18.0"},
        cep: {versionId: "7.0", downloadURL: "http://raw.githubusercontent.com/Adobe-CEP/CEP-Resources/master/CEP_7.x"}
    },
    "CC 2018": {
		photoshop: {versionId: "19.0"},
        cep: {versionId: "8.0", downloadURL: "http://raw.githubusercontent.com/Adobe-CEP/CEP-Resources/master/CEP_8.x"}
    }
}

class Validations {
	
	static valueIsSpecified(input) {
		if (! input || input.trim().length === 0) {
			return 'You must specify a value';
		} else {
			return true;
		}
	}
	
	static valueIsId(input) {
		var valueIsSpecified = Validations.valueIsSpecified(input);
		if (valueIsSpecified === true) {
			var regex = '[A-Za-z0-9]+[A-Za-z0-9_\\-\\.]?[A-Za-z0-9]?';
			if (! input.match(regex)) {
				return 'Specified value is not a valid ID.\nA valid ID must match the regular expression: ' + regex;
			} else {
				return true;
			}
		} else {
			return valueIsSpecified;
		}
	}
	
	static exactlyOneOptionIsSelected(input) {
		if (input.length < 1) {
			return "You must select an option";
		} else if (input.length > 1) {
			return "You may select one option only";
		} else {
			return true;
		}
	}
}
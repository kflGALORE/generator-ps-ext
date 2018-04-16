var Generator = require('yeoman-generator');

module.exports = class extends Generator {
	constructor(args, opts) {
		super(args, opts);
		
		this.context = {
			extension: {
				photoshop: {}
			},
			
			applyAnswers(answers) {
				this.extension.id = answers.extensionId;
				this.extension.name = answers.extensionName;
				this.extension.photoshop.versionName = answers.psVersionName[0];
			}
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
					choices: ['CC 2014', 'CC 2015'],
					default: ['CC 2015'],
					message: 'Photoshop version:',
					validate: Validations.exactlyOneOptionIsSelected
				}
			])
			.then((answers) => {
				this.context.applyAnswers(answers);
			});
	};
	
	writing() {
		this.fs.copyTpl(this.templatePath('**'), this.destinationPath(this.context.extension.id), this.context);
	};

};

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
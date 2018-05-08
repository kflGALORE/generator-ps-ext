var gulp = require('gulp');
var ejs = require('gulp-ejs');
var del = require('del');
var fs = require('fs');
var exec = require('child_process').exec;

var psExtension = JSON.parse(fs.readFileSync("ps-extension.js"));

gulp.task('default', ['build']);

gulp.task('clean', ['ui:clean', 'host:clean'], () => {
    del(['dist/**', '!dist'], {force:true});
});

gulp.task('ui:clean', () => {
    del(['ui/dist/**', '!ui/dist'], {force:true});
});

gulp.task('host:clean', () => {
    del(['host/dist/**', '!host/dist'], {force:true});
});

gulp.task('build', ['ui:build', 'host:build'], (done) => {
	gulp.src('.templates/manifest.xml')
		.pipe(ejs(psExtension, {}, {ext: '.xml'}))
		.pipe(gulp.dest('dist/CSXS'))
        .on('end', () => {
            gulp.src('.templates/.debug')
                .pipe(ejs(psExtension, {}, {ext: ''}))
                .pipe(gulp.dest('dist'))
                .on('end', () => {
                    gulp.src('ui/dist/**')
                        .pipe(gulp.dest('dist/ui'))
                        .on('end', () => {
                            gulp.src('host/dist/**')
                                .pipe(gulp.dest('dist/host'))
                                .on('end', () => {
                                    done();
                                });
                        });
                });
        });
});

gulp.task('ui:build', (done) => {
    exec('ng build --base-href ./', {cwd: 'ui'},  (err, stdout, stderr) => {
        if (err) {
            done(err);
        } else if (stderr) {
            done(err);
        } else {
            done();
        }
    });
});

gulp.task('host:build', (done) => {
    gulp.src('host/src/script.jsx')
        .pipe(gulp.dest('host/dist'))
        .on('end', () => {
            done();
        })
        .on('error', (err) => {
            done(err);
        });
});

gulp.task('deploy', (done) => {
    if (! dirExists('dist') || dirIsEmpty('dist')) {
        return fail(done, 'Nothing to deploy. Run "build" task first.');
    }
    
    var deploymentDir = psExtension.deploymentDir;
	var previousDeploymentDir;
    if (dirExists(deploymentDir)) {
		var deploymentBackupDir = deploymentDir + '.' + Date.now();
		fs.renameSync(deploymentDir, deploymentBackupDir);
		previousDeploymentDir = deploymentBackupDir;
    }
    
    gulp.src('dist/**', {dot:true})
        .pipe(gulp.dest(deploymentDir))
        .on('end', () => {
			if (previousDeploymentDir) {
				del.sync([previousDeploymentDir], {force:true});
				done();
			} else {
				done();
			}
        })
		.on('error', (err) => {
			if (previousDeploymentDir) {
				if (dirExists(deploymentDir)) {
					del.sync([deploymentDir], {force:true});
				}
				fs.renameSync(previousDeploymentDir, deploymentDir);
			}
			done(err);
		});
});

function fail(done, message) {
    var error = new Error(message);
    error.showStack = false;
    done(error);
    return -1;
}

function dirExists(path) {
    if (! fs.existsSync(path)) {
        return false;
    }
    return fs.statSync(path).isDirectory();
}

function dirIsEmpty(path) {
    return fs.readdirSync(path).length == 0;
}

var gulp = require('gulp');
var ts = require('gulp-typescript');
var clean = require('gulp-clean');
var rimraf = require('gulp-rimraf');
var typedoc = require("gulp-typedoc");
var runSequence = require('run-sequence');
var concat = require('gulp-concat');
var dts = require('dts-bundle');

var tsProject = ts.createProject({
    declaration: true,
    noExternalResolve: true,
    module:'amd',
    experimentalDecorators: true
});

gulp.task('clean', function() {
    return gulp.src(['./lib/**/*.js','./lib/**/*.d.ts'], { read: false })
        .pipe(rimraf());
});

gulp.task('build', function() {
    var tsResult = gulp.src(['./src/**/*.ts', './devtypes/**/*.ts'])
        .pipe(ts(tsProject));
    tsResult.dts.pipe(gulp.dest('./'));
    return tsResult.js.pipe(gulp.dest('./'));
});

gulp.task('typings', function() {
    dts.bundle({
        name: 'TJAngular',
        main: './index.d.ts'
    });
})

gulp.task('package',function(callback) {
    runSequence('clean',
        'build',
        'typings',
        callback);
});

gulp.task('watch', ['build'], function() {
    gulp.watch('src/**/*.ts', ['build']);
});

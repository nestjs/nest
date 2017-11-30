const gulp = require('gulp');
const ts = require('gulp-typescript');
const gulpSequence = require('gulp-sequence');

const packages = {
	common: ts.createProject('src/common/tsconfig.json'),
	core: ts.createProject('src/core/tsconfig.json'),
	microservices: ts.createProject('src/microservices/tsconfig.json'),
	websockets: ts.createProject('src/websockets/tsconfig.json'),
	testing: ts.createProject('src/testing/tsconfig.json'),
};
const modules = Object.keys(packages);
const source = 'src';
const distId = process.argv.indexOf('--dist');
const dist = distId < 0 ? 'node_modules/@nestjs' : process.argv[distId + 1];

gulp.task('default', function() {
	modules.forEach(module => {
		gulp.watch(
			[`${source}/${module}/**/*.ts`, `${source}/${module}/*.ts`],
			[module]
		);
	});
});

modules.forEach(module => {
	gulp.task(module, () => {
		return packages[module]
			.src()
			.pipe(packages[module]())
			.pipe(gulp.dest(`${dist}/${module}`));
	});
});

gulp.task('build', function(cb) {
	gulpSequence('common', modules.filter((module) => module !== 'common'), cb);
});

gulp.task('move', function() {
	gulp.src(['node_modules/@nestjs/**/*']).pipe(
    gulp.dest('examples/01-cats-app/node_modules/@nestjs')
  ).pipe(
    gulp.dest('examples/02-gateways/node_modules/@nestjs')
  ).pipe(
    gulp.dest('examples/03-microservices/node_modules/@nestjs')
  ).pipe(
    gulp.dest('examples/04-injector/node_modules/@nestjs')
  ).pipe(
    gulp.dest('examples/05-sql-typeorm/node_modules/@nestjs')
  ).pipe(
    gulp.dest('examples/06-mongoose/node_modules/@nestjs')
  ).pipe(
    gulp.dest('examples/07-sequelize/node_modules/@nestjs')
  ).pipe(
    gulp.dest('examples/08-passport/node_modules/@nestjs')
  ).pipe(
    gulp.dest('examples/09-babel-example/node_modules/@nestjs')
  ).pipe(
    gulp.dest('examples/11-swagger/node_modules/@nestjs')
  );
});

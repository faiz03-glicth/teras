import journal from './meta/_journal.json';
import m0000 from './0000_classy_infant_terrible.sql';
import m0001 from './0001_workout_model.sql';
import m0002 from './0002_favourites_per_owner.sql';
import m0003 from './0003_routine_starters.sql';
import m0004 from './0004_exercise_dataset.sql';
import m0005 from './0005_exercise_curation.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003,
m0004,
m0005
    }
  }
  
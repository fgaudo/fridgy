import 'package:sqlite3/common.dart';

import '../../../application/commands/log.dart';

void acquireDb(
  Log log,
  CommonDatabase database,
  void Function(CommonDatabase) f,
) {
  try {
    f(database);
  } catch (e) {
    log(LogType.error, e.toString());
  } finally {
    database.dispose();
  }
}

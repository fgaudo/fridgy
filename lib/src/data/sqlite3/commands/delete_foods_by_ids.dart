import 'package:fgaudo_functional/extensions/reader/local.dart';
import 'package:fgaudo_functional/extensions/reader_io/asks.dart';
import 'package:fgaudo_functional/extensions/reader_io/flat_map.dart';
import 'package:fgaudo_functional/extensions/reader_io/flat_map_io.dart';
import 'package:fgaudo_functional/extensions/reader_io/map.dart';
import 'package:fgaudo_functional/extensions/reader_io/sequence_array.dart';
import 'package:fgaudo_functional/reader_io.dart';
import 'package:sqlite3/wasm.dart';

import '../../../application/commands/delete_foods_by_ids.dart';
import '../../../core/commands/log.dart';
import '../bootstrap.dart';
import '../helpers/prepared_statement.dart';
import '../helpers/transaction.dart';

typedef DeleteFoodsByIdsDeps<LOG> = ({CommonDatabase db, LOG logEnv});

const String deleteQuery =
    'DELETE FROM $FOODS_TABLE WHERE $FOODS_TABLE_NAME = ?;';

DeleteFoodsByIds<DeleteFoodsByIdsDeps<LOG>> prepareDeleteFoodsByIds<LOG>(
  Log<LOG> log,
) =>
    (ids) => transaction(
          log: log,
          preparedStatement(
            sql: deleteQuery,
            log: log,
            use: (ps) => Do<DeleteFoodsByIdsDeps<LOG>>()
                .map(
                  (_) => ids.map((id) => [id]),
                )
                .flatMap(
                  (ids) => ids
                      .map(
                        (id) => Do<DeleteFoodsByIdsDeps<LOG>>()
                            .flatMapIO(
                              (_) => () => ps.execute(id),
                            )
                            .asks((deps) => deps.logEnv)
                            .flatMapIO(
                              log(
                                LogType.info,
                                'SQL: "$deleteQuery" with $id',
                              ),
                            ),
                      )
                      .sequenceArray(),
                ),
          ).local(
            (DeleteFoodsByIdsDeps<LOG> deps) => (
              env: deps,
              logEnv: deps.logEnv,
              db: deps.db,
            ),
          ),
        ).local(
          (deps) => (
            env: deps,
            logEnv: deps.logEnv,
            db: deps.db,
          ),
        );

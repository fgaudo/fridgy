import 'package:functionally/oo/reader_io.dart' as RIOX;
import 'package:functionally/reader_io.dart' as RIO;

import 'package:logging/logging.dart';
import 'package:sqlite3/wasm.dart';

import '../../application/commands/delete_foods_by_ids.dart';
import '../../application/commands/log.dart';
import '../helpers/prepared_statement.dart';
import '../helpers/transaction.dart';
import '../schema.dart';
import 'log.dart';

typedef DeleteFoodsByIdsDeps = ({CommonDatabase db, Logger logEnv});

const String deleteQuery =
    'DELETE FROM $FOODS_TABLE WHERE $FOODS_TABLE_NAME = ?;';

DeleteFoodsByIdsReader<DeleteFoodsByIdsDeps> prepareDeleteFoodsByIds =
    (ids) => transaction(
          preparedStatement(
            sql: deleteQuery,
            run: (preparedStatement) => RIOX
                .make<DeleteFoodsByIdsDeps>()
                .map(
                  (_) => ids.map((id) => [id]),
                )
                .flatMap(
                  (ids) => RIO.sequenceArray(
                    ids.map(
                      (id) => RIOX
                          .make<DeleteFoodsByIdsDeps>()
                          .flatMapIO(
                            (_) => () => preparedStatement.execute(id),
                          )
                          .apFirst(
                            _info(
                              'SQL: "$deleteQuery" with $id',
                            ),
                          )
                          .build(),
                    ),
                  ),
                )
                .build(),
          )
              .toReaderIOBuilder()
              .local(
                _toPreparedStatementDeps,
              )
              .build(),
        )
            .toReaderIOBuilder()
            .local(
              _toTransactionDeps,
            )
            .toReaderTask()
            .build();

RIO.ReaderIO<DeleteFoodsByIdsDeps, void> _info(String message) =>
    log(LogType.info, message)
        .toReaderIOBuilder()
        .local((DeleteFoodsByIdsDeps deps) => deps.logEnv)
        .build();

TransactionDeps<DeleteFoodsByIdsDeps> _toTransactionDeps(
  DeleteFoodsByIdsDeps deps,
) =>
    (
      env: deps,
      logEnv: deps.logEnv,
      db: deps.db,
    );

PreparedStatementDeps<DeleteFoodsByIdsDeps> _toPreparedStatementDeps(
  DeleteFoodsByIdsDeps deps,
) =>
    (
      env: deps,
      logEnv: deps.logEnv,
      db: deps.db,
    );

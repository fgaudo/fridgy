import 'package:functionally/reader_task.dart';
import 'package:functionally/task.dart';

typedef EnqueueDeleteFoodsByIdsReader<ENV> = ReaderTask<ENV, void> Function(
  Set<String> ids,
);

typedef EnqueueDeleteFoodsByIds = Task<void> Function(
  Set<String> ids,
);

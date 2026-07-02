namespace Rambler.Server.Socket.Processors
{
    using Contracts.Responses;
    using Socket;
    using System.Threading.Tasks;

    public class ChannelTypingResponseProcessor : IResponseProcesor<ChannelTypingResponse>
    {
        private readonly SocketSubscriptions subs;

        public ChannelTypingResponseProcessor(SocketSubscriptions subs)
        {
            this.subs = subs;
        }

        public async Task Process(Response<ChannelTypingResponse> response)
        {
            await subs.Publish(response);
        }
    }
}
